import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test as base, expect, openWorkspace, widget } from './fixtures.mjs';
import { capture } from './screenshots.mjs';

const require = createRequire(import.meta.url);
const socketIO = require('socket.io');

export { expect, widget };

// Read-only protocol snapshots exercise connected layouts without opening hardware.
export const test = base.extend({
  controllerSnapshot: async ({ context, page, baseURL, socketGuard }, use, testInfo) => {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
      throw new Error('Controller snapshot scenarios require a local CNCjs application.');
    }
    const server = createServer();
    const io = socketIO(server, { transports: ['polling'], allowUpgrades: false });
    let client;
    io.on('connection', socket => {
      client = socket;
      socket.emit('startup', { availableControllers: ['Grbl', 'Marlin', 'Smoothie', 'TinyG'] });
    });
    await new Promise(resolve => {
      server.listen(0, '127.0.0.1', resolve);
    });
    socketGuard.usePollingProxy(server);
    try {
      await openWorkspace(page);
      await expect.poll(() => Boolean(client)).toBe(true);
      await use(({ type, settings, state }) => {
        client.emit('connection:open', {
          type: 'socket', ident: 'e2e-read-only-snapshot', options: { host: 'snapshot', port: 0 },
        });
        client.emit('controller:settings', type, settings);
        client.emit('controller:state', type, state);
      });
    } finally {
      await capture(page, testInfo, 'final-page', { fullPage: true });
      await page.close();
      await context.unrouteAll({ behavior: 'wait' });
      await new Promise(resolve => {
        io.close(resolve);
      });
    }
  },
});
