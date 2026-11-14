import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test as base, expect, openWorkspace, widget } from './fixtures.mjs';

const require = createRequire(import.meta.url);

// Load the same identifier helper used by the CNCjs service engine, without
// relying on an existing development build or leaving a global Babel hook installed.
function socketIdent(options) {
  const register = require('@babel/register');
  register({ cache: false });
  try {
    return require('../../../src/server/lib/SocketConnection').toIdent(options);
  } finally {
    register.revert();
  }
}

export { expect, widget };
export const test = base.extend({
  simulator: async ({ page, baseURL, gcodeUploadPolicy, socketGuard }, use) => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
      throw new Error('Simulator scenarios require a local CNCjs backend.');
    }
    const child = spawn(process.execPath, ['-e', `
      const GrblServer = require('./grbl-simulator/grbl-server');
      const server = new GrblServer(0);
      const processRealtimeCommand = server.simulator.processRealtimeCommand.bind(server.simulator);
      server.simulator.processRealtimeCommand = (char) => {
        console.log('E2E RT: ' + server.escapeChar(char));
        return processRealtimeCommand(char);
      };
      server.start('127.0.0.1');
      server.server.once('listening', () => console.log('E2E_PORT=' + server.server.address().port));
    `], { cwd: fileURLToPath(new URL('../../../', import.meta.url)), stdio: ['ignore', 'pipe', 'pipe'] });
    child.once('exit', () => {
      gcodeUploadPolicy.ident = null;
      socketGuard.revokeSimulator();
    });
    const lines = createInterface({ input: child.stdout });
    const commands = [];
    lines.on('line', line => {
      if (line.includes(' CMD: ') || line.includes(' RT: ')) {
        commands.push(line);
      }
    });
    try {
      const port = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Simulator did not bind a port')), 10_000);
        child.once('error', reject);
        child.once('exit', code => reject(new Error(`Simulator exited before connection: ${code}`)));
        lines.on('line', line => {
          if (!line.startsWith('E2E_PORT=')) {
            return;
          }
          clearTimeout(timer);
          resolve(Number(line.slice('E2E_PORT='.length)));
        });
      });
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error('Simulator exited before socket approval.');
      }
      socketGuard.approveSimulator({
        port,
        commands: [
          'autolevel:getProbeState', 'autolevel:start', 'autolevel:stop', 'gcode', 'cycle_start', 'feed_hold', 'homing', 'sleep',
          'unlock', 'reset', 'jog_cancel', 'feed_override', 'rapid_override', 'spindle_override',
          'sender_load', 'sender_start', 'sender_resume', 'sender_pause', 'sender_stop', 'sender_unload',
        ],
      });
      await openWorkspace(page);
      const connection = widget(page, 'connection');
      await connection.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
      await connection.getByRole('textbox', { name: 'Host', exact: true }).fill('127.0.0.1');
      await connection.getByRole('spinbutton', { name: 'Port', exact: true }).fill(String(port));
      await connection.getByRole('button', { name: 'Open', exact: true }).click();
      await expect(widget(page, 'visualizer').getByRole('button', { name: 'Upload G-code', exact: true })).toBeEnabled();
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error('Simulator exited before G-code upload approval.');
      }
      gcodeUploadPolicy.ident = socketIdent({ host: '127.0.0.1', port });
      await use({ port, commands });
    } finally {
      gcodeUploadPolicy.ident = null;
      try {
        const close = widget(page, 'connection').getByRole('button', { name: 'Close', exact: true });
        if (!page.isClosed() && await close.isEnabled().catch(() => false)) {
          await close.click();
          await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
          await expect(widget(page, 'connection').getByRole('button', { name: 'Open', exact: true })).toBeVisible();
        }
      } finally {
        socketGuard.revokeSimulator();
        lines.close();
        if (child.exitCode === null && child.signalCode === null) {
          const exited = once(child, 'exit');
          child.kill('SIGTERM');
          await exited;
        }
      }
    }
  },
});
