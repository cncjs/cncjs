import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const gates = [];
const wire = [];
const consoleIssues = [];
const pageErrors = [];
const requestFailures = [];

function decodePayload(payload = '') {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon > cursor && /^\d+$/.test(payload.slice(cursor, colon))) {
      const length = Number(payload.slice(cursor, colon));
      const start = colon + 1;
      const packet = payload.slice(start, start + length);
      if (packet.length !== length) break;
      packets.push(packet);
      cursor = start + length;
      continue;
    }
    const separator = payload.indexOf('\x1e', cursor);
    packets.push(payload.slice(cursor, separator < 0 ? payload.length : separator));
    if (separator < 0) break;
    cursor = separator + 1;
  }
  return packets;
}

page.on('request', request => {
  let pathname;
  try { pathname = new URL(request.url()).pathname; } catch (_) { return; }
  if (request.method() !== 'POST' || !pathname.endsWith('/socket.io/')) return;
  for (const packet of decodePayload(request.postData() || '')) {
    const match = packet.match(/^42(\d*)(\[.*\])$/s);
    if (!match) continue;
    try {
      const args = JSON.parse(match[2]);
      if (args[0] === 'open') {
        const options = args[3] || {};
        const serial = options.serial || options;
        wire.push({ event: 'open', controllerType: args[1], connectionType: args[2], serial: { path: serial.path, baudRate: serial.baudRate } });
      } else if (args[0] === 'close') {
        wire.push({ event: 'close' });
      } else if (args[0] === 'command' && args[2] === 'gcode') {
        wire.push({ event: 'gcode', command: args[3] });
      }
    } catch (_) { /* Ignore unrelated Socket.IO frames. */ }
  }
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type(), text: message.text().slice(0, 400) });
});
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('requestfailed', request => requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));

const flush = () => fs.writeFileSync(path.join(artifactDir, 'jog-release.json'), JSON.stringify({
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
  gates,
  wire,
  consoleIssues,
  pageErrors,
  requestFailures,
}, null, 2) + '\n');

async function gate(name, action) {
  const started = Date.now();
  try {
    const result = await action();
    gates.push({ name, status: 'passed', durationMs: Date.now() - started, ...(result || {}) });
  } catch (error) {
    gates.push({ name, status: 'failed', durationMs: Date.now() - started, error: String(error).slice(0, 1000) });
    await page.screenshot({ path: path.join(artifactDir, `jog-release-failure-${name}.png`) }).catch(() => {});
  }
  flush();
  return gates[gates.length - 1].status === 'passed';
}

async function waitUntil(check, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`Condition not met within ${timeoutMs} ms`);
}

try {
  await gate('load-workspace', async () => {
    await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.getByRole('region', { name: 'Connection widget', exact: true }).waitFor();
    await page.getByRole('region', { name: 'Axes widget', exact: true }).waitFor();
    return { route: '/workspace' };
  });

  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  await gate('disable-auto-reconnect', async () => {
    const checkbox = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
    const wasChecked = await checkbox.isChecked();
    if (wasChecked) await connection.getByText('Connect automatically', { exact: true }).click();
    if (await checkbox.isChecked()) throw new Error('Auto reconnect remains enabled');
    return { wasChecked, checkedAfter: false };
  });

  await gate('select-grbl', async () => {
    const controller = connection.getByRole('button', { name: 'Grbl', exact: true });
    if (await controller.getAttribute('data-selected') === null) await controller.click();
    if (await controller.getAttribute('data-selected') === null) throw new Error('Grbl is not selected');
    return { selected: true };
  });

  await gate('select-simulator-port', async () => {
    await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
    const option = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
    await option.waitFor({ state: 'visible' });
    const label = (await option.innerText()).trim();
    await option.click();
    return { optionLabel: label };
  });

  await gate('connect-simulator', async () => {
    const open = connection.getByRole('button', { name: 'Open', exact: true });
    if (!(await open.isEnabled())) throw new Error('Open control disabled after Grbl/port selection');
    await open.click();
    await connection.getByRole('button', { name: 'Close', exact: true }).waitFor({ state: 'visible' });
    return { closeControlVisible: true };
  });

  await gate('jog-arrow-right-keydown', async () => {
    const axes = page.getByRole('region', { name: 'Axes widget', exact: true });
    await axes.getByRole('button', { name: 'Toggle keypad jogging', exact: true }).click();
    await axes.getByText('Axes', { exact: true }).click();
    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName || null);
    const firstIndex = wire.filter(item => item.event === 'gcode').length;
    await page.keyboard.down('ArrowRight');
    await waitUntil(() => wire.filter(item => item.event === 'gcode').length >= firstIndex + 3, 4000).catch(() => {
      throw new Error(`ArrowRight emitted no jog commands after click on Axes header; active element ${activeElementTag}`);
    });
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(400);
    const commands = wire.filter(item => item.event === 'gcode').slice(firstIndex).map(item => item.command);
    if (commands.length !== 3 || commands[0] !== 'G91' || !/^G0 X-?[\d.]+$/.test(commands[1]) || commands[2] !== 'G90') {
      throw new Error(`Unexpected jog command sequence: ${JSON.stringify(commands)}`);
    }
    return { key: 'ArrowRight', clicked: 'Axes widget title', activeElementTag, commands };
  });

  await gate('jog-axes-button-pointerdown-and-release', async () => {
    const axes = page.getByRole('region', { name: 'Axes widget', exact: true });
    const button = axes.getByRole('button', { name: 'Move X positive', exact: true });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error('Move X positive has no visible pointer target');
    const firstIndex = wire.filter(item => item.event === 'gcode').length;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    await page.mouse.up();
    await waitUntil(() => wire.filter(item => item.event === 'gcode').length >= firstIndex + 3, 4000);
    await page.waitForTimeout(400);
    const commands = wire.filter(item => item.event === 'gcode').slice(firstIndex).map(item => item.command);
    if (commands.length !== 3 || commands[0] !== 'G91' || !/^G0 X-?[\d.]+$/.test(commands[1]) || commands[2] !== 'G90') {
      throw new Error(`Unexpected pointer jog command sequence: ${JSON.stringify(commands)}`);
    }
    return { button: 'Move X positive', pointerDownMs: 250, commands, oneShotAfterRelease: true };
  });

  await gate('jog-keyup-release', async () => {
    const commandCount = wire.filter(item => item.event === 'gcode').length;
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500);
    const commandsAfterRelease = wire.filter(item => item.event === 'gcode').length;
    if (commandsAfterRelease !== commandCount) throw new Error(`Key release emitted ${commandsAfterRelease - commandCount} extra G-code commands`);
    return { gcodeCountBefore: commandCount, gcodeCountAfter: commandsAfterRelease, noExtraCommandsAfterRelease: true };
  });

  await gate('disconnect-simulator', async () => {
    await connection.getByRole('button', { name: 'Close', exact: true }).click();
    const confirm = page.getByRole('button', { name: 'OK', exact: true });
    await confirm.waitFor({ state: 'visible' });
    await confirm.click();
    await connection.getByRole('button', { name: 'Open', exact: true }).waitFor({ state: 'visible' });
    return { disconnected: true };
  });

  await page.screenshot({ path: path.join(artifactDir, 'jog-release-final.png'), fullPage: true });
} finally {
  flush();
  await browser.close();
}
