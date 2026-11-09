import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const tempDir = '/tmp/cncjs-r6-20261001';
const fixturePath = path.join(tempDir, 'r6-simulator-dwell.gcode');
const fixture = ['G21', 'G90', 'G0 X0 Y0 Z0', 'G4 P12', 'G1 X5 Y0 F120', ''].join('\n');
fs.writeFileSync(fixturePath, fixture);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const wire = { outgoing: [], incomingEvents: [] };
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

function summarizeOutgoing(packet) {
  const match = packet.match(/^42(\d*)(\[.*\])$/s);
  if (!match) return;
  let args;
  try { args = JSON.parse(match[2]); } catch (_) { return; }
  const event = args?.[0];
  if (!['open', 'close', 'command', 'write', 'writeln'].includes(event)) return;
  const item = { event, ackId: match[1] || null };
  if (event === 'command') {
    // The first command argument is the ephemeral connection ident. Never persist it.
    const command = args[2];
    item.command = command;
    item.args = args.slice(3).map(value => {
      if (typeof value !== 'string' || value.length <= 500) return value;
      return { byteLength: Buffer.byteLength(value), sha256: crypto.createHash('sha256').update(value).digest('hex') };
    });
  } else if (event === 'write' || event === 'writeln') {
    const value = args[2];
    item.data = typeof value === 'string' && value.length <= 500
      ? value
      : { byteLength: Buffer.byteLength(String(value)), sha256: crypto.createHash('sha256').update(String(value)).digest('hex') };
  } else if (event === 'open') {
    item.controllerType = args[1] || null;
    item.connectionType = args[2] || null;
    const options = args[3] || {};
    const serial = options.serial || options;
    item.serial = {
      path: serial.path,
      baudRate: serial.baudRate,
      rtscts: serial.rtscts,
      pin: serial.pin,
    };
  }
  wire.outgoing.push(item);
}

function summarizeIncoming(packet) {
  const match = packet.match(/^42(\d*)(\[.*\])$/s);
  if (!match) return;
  let args;
  try { args = JSON.parse(match[2]); } catch (_) { return; }
  const name = args?.[0];
  if (typeof name === 'string' && ['startup', 'connection:open', 'connection:close', 'connection:change', 'controller:state', 'workflow:state', 'serialport:read', 'serialport:write'].includes(name)) {
    wire.incomingEvents.push({ name });
  }
}

page.on('request', (request) => {
  let pathname;
  try { pathname = new URL(request.url()).pathname; } catch (_) { return; }
  if (request.method() !== 'POST' || !pathname.endsWith('/socket.io/')) return;
  for (const packet of decodePayload(request.postData() || '')) summarizeOutgoing(packet);
});
page.on('response', async (response) => {
  let pathname;
  try { pathname = new URL(response.url()).pathname; } catch (_) { return; }
  if (!pathname.endsWith('/socket.io/')) return;
  let payload;
  try { payload = await response.text(); } catch (_) { return; }
  for (const packet of decodePayload(payload)) summarizeIncoming(packet);
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type(), text: message.text().slice(0, 400) });
});
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('requestfailed', request => requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));

const gates = [];
async function gate(name, action) {
  const started = Date.now();
  try {
    const detail = await action();
    gates.push({ name, status: 'passed', durationMs: Date.now() - started, ...(detail || {}) });
    return true;
  } catch (error) {
    gates.push({ name, status: 'failed', durationMs: Date.now() - started, error: String(error).slice(0, 500) });
    await page.screenshot({ path: path.join(artifactDir, `simulator-failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`) }).catch(() => {});
    return false;
  }
}

async function waitUntil(check, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`Condition not met within ${timeoutMs} ms`);
}

await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 20000 });
const connection = page.getByRole('region', { name: 'Connection widget' });
await connection.waitFor();

await gate('disable-auto-reconnect', async () => {
  const checkbox = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  const wasChecked = await checkbox.isChecked();
  if (wasChecked) await connection.getByText('Connect automatically', { exact: true }).click();
  if (await checkbox.isChecked()) throw new Error('Auto reconnect remains enabled');
  return { wasChecked, checkedAfter: await checkbox.isChecked() };
});

await gate('select-grbl-controller', async () => {
  const grblButton = connection.getByRole('button', { name: 'Grbl', exact: true });
  const selected = await grblButton.getAttribute('data-selected') !== null;
  if (!selected) {
    if (!(await grblButton.isEnabled())) throw new Error('Grbl controller choice is disabled before serial selection');
    await grblButton.click();
  }
  return { selectedBefore: selected, selectedAfter: await grblButton.getAttribute('data-selected') !== null };
});

await gate('choose-simulator-port', async () => {
  const portButton = connection.getByRole('button', { name: 'Serial port', exact: true });
  await portButton.click();
  const simulatorOption = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await simulatorOption.waitFor({ state: 'visible' });
  const label = await simulatorOption.innerText();
  await simulatorOption.click();
  return { optionLabel: label.trim() };
});

await gate('connect-grbl-simulator', async () => {
  const openButton = connection.getByRole('button', { name: 'Open', exact: true });
  if (!(await openButton.isEnabled())) throw new Error('Open is disabled after selecting simulator and Grbl');
  await openButton.click();
  await connection.getByRole('button', { name: 'Close', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(700);
  return { connectedButtonVisible: true, connectionText: (await connection.innerText()).slice(0, 500) };
});

await gate('load-dwell-gcode', async () => {
  const upload = page.getByRole('button', { name: 'Upload G-code', exact: true });
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2000 }).catch(() => null);
  await upload.click();
  const chooser = await chooserPromise;
  if (chooser) {
    await chooser.setFiles(fixturePath);
  } else {
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath);
  }
  const run = page.getByRole('button', { name: 'Run', exact: true });
  await waitUntil(() => run.isEnabled(), 30000);
  return { fixture: path.basename(fixturePath), fixtureSha256: crypto.createHash('sha256').update(fixture).digest('hex'), runEnabled: true, usedFileChooser: !!chooser };
});

await gate('run', async () => {
  const run = page.getByRole('button', { name: 'Run', exact: true });
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  await run.click();
  await waitUntil(() => pause.isEnabled(), 15000);
  return { runEnabled: await run.isEnabled(), pauseEnabled: await pause.isEnabled() };
});

await gate('pause', async () => {
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const run = page.getByRole('button', { name: 'Run', exact: true });
  await waitUntil(async () => (await run.getAttribute('title')) === 'Resume', 10000);
  return { runTitle: await run.getAttribute('title'), stopEnabled: await page.getByRole('button', { name: 'Stop', exact: true }).isEnabled() };
});

await gate('resume', async () => {
  const run = page.getByRole('button', { name: 'Run', exact: true });
  if ((await run.getAttribute('title')) !== 'Resume') throw new Error('Run control is not in Resume state');
  await run.click();
  await waitUntil(() => page.getByRole('button', { name: 'Pause', exact: true }).isEnabled(), 10000);
  return { resumed: true };
});

await gate('pause-before-stop', async () => {
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  await pause.click();
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  await waitUntil(() => stop.isEnabled(), 10000);
  return { stopEnabled: true };
});

await gate('stop', async () => {
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await waitUntil(async () => !(await page.getByRole('button', { name: 'Stop', exact: true }).isEnabled()), 15000);
  return { stopDisabledAfterStop: true, runTitle: await page.getByRole('button', { name: 'Run', exact: true }).getAttribute('title') };
});

await gate('unload-gcode', async () => {
  const closeFile = page.getByRole('button', { name: 'Close G-code file', exact: true });
  if (await closeFile.isEnabled()) await closeFile.click();
  await page.waitForTimeout(300);
  return { closeFileEnabledAfterUnload: await closeFile.isEnabled() };
});

await gate('jog-keydown-and-release', async () => {
  const axes = page.getByRole('region', { name: 'Axes widget', exact: true });
  const toggle = axes.getByRole('button', { name: 'Toggle keypad jogging', exact: true });
  await toggle.click();
  await page.locator('canvas').first().click({ position: { x: 5, y: 5 } });
  const activeElementTag = await page.evaluate(() => document.activeElement?.tagName || null);
  const before = wire.outgoing.filter(item => item.command === 'gcode').length;
  await page.keyboard.down('ArrowRight');
  await waitUntil(() => wire.outgoing.filter(item => item.command === 'gcode').length >= before + 3, 5000);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(500);
  const jogCommands = wire.outgoing.filter(item => item.command === 'gcode').slice(before).map(item => item.args[0]);
  if (jogCommands.length !== 3 || jogCommands[0] !== 'G91' || !/^G0 X-?[\d.]+$/.test(jogCommands[1]) || jogCommands[2] !== 'G90') {
    throw new Error(`Unexpected jog command sequence: ${JSON.stringify(jogCommands)}`);
  }
  return { key: 'ArrowRight', activeElementTag, jogCommands, noRepeatAfterRelease: true };
});

await gate('disconnect-simulator', async () => {
  await connection.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await connection.getByRole('button', { name: 'Open', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  return { disconnected: true };
});

await page.screenshot({ path: path.join(artifactDir, 'simulator-flow-final.png'), fullPage: true });
const result = {
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
  fixture: { path: fixturePath, bytes: Buffer.byteLength(fixture), sha256: crypto.createHash('sha256').update(fixture).digest('hex'), commands: fixture.trim().split('\n') },
  gates,
  wire,
  consoleIssues,
  pageErrors,
  requestFailures,
};
fs.writeFileSync(path.join(artifactDir, 'simulator-flow.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
await browser.close();
