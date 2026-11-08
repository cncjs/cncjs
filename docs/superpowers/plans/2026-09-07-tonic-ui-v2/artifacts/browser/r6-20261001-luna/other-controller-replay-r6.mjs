import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  storageState: process.env.R6_STORAGE_STATE,
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(30000);

const result = {
  browser: { version: browser.version(), channel: 'bundled Chromium', viewport: '1440x900', dpr: 1 },
  transport: { method: 'Socket.IO Engine.IO v3 polling response relay with synthetic incoming controller events appended after the actual connection:open event', injected: [], pollingGetCount: 0, websocketUpgradeClosed: 0, suppressedGrblControllerEvents: 0, incomingEvents: [], suppressedEvents: [] },
  gates: [],
  pageErrors: [],
  requestFailures: [],
  consoleIssues: [],
  outgoingCommands: [],
};
const flush = () => fs.writeFileSync(path.join(artifactDir, 'other-controller-replay-r6-progress.json'), `${JSON.stringify(result, null, 2)}\n`);
function sanitizeDiagnostic(value) {
  return String(value)
    .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
}
function frameSummary(direction, payload) {
  if (typeof payload !== 'string') return { direction, type: 'binary' };
  const event = payload.match(/^42\d*(\[.*\])$/s);
  if (event) {
    try {
      const args = JSON.parse(event[1]);
      return { direction, type: 'event', name: args[0], controller: typeof args[1] === 'string' ? args[1] : undefined };
    } catch (_) { return { direction, type: 'event', name: 'unparsed' }; }
  }
  return { direction, type: payload[0] || 'empty' };
}
// Force Engine.IO v3 to remain on authenticated polling. The polling response
// relay preserves unrelated server packets, replaces only live Grbl
// controller:settings/state packets while a fixture is active, then appends a
// settings+state pair in that same response so both listeners see one ordered
// controller transition through the real Socket.IO client.
await page.routeWebSocket('**/socket.io/**', socketRoute => {
  result.transport.websocketUpgradeClosed += 1;
  socketRoute.close();
  flush();
});
let pendingFixtures = [];
await page.route('**/socket.io/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (request.method() === 'POST') {
    const postData = request.postData() || '';
    for (const packet of decodePayload(postData)) recordPacket(packet, 'polling-post');
    return route.continue();
  }
  if (request.method() !== 'GET' || url.searchParams.get('transport') !== 'polling' || !url.searchParams.has('sid')) {
    return route.continue();
  }
  result.transport.pollingGetCount += 1;
  try {
    const response = await route.fetch();
    const raw = await response.text();
    const packets = decodePayload(raw);
    if (!packets.length) {
      result.transport.incomingEvents.push({ pollingGet: result.transport.pollingGetCount, kind: 'unparsed-payload', payloadBytes: Buffer.byteLength(raw) });
      return route.fulfill({ response });
    }
    const containsActualConnectionOpen = packets.some(packet => {
      const summary = frameSummary('server-to-page', packet);
      return summary.type === 'event' && summary.name === 'connection:open';
    });
    const fixturesForResponse = containsActualConnectionOpen ? pendingFixtures : [];
    if (fixturesForResponse.length) pendingFixtures = [];
    const kept = [];
    for (const packet of packets) {
      const summary = frameSummary('server-to-page', packet);
      if (summary.type === 'event') {
        result.transport.incomingEvents.push({ pollingGet: result.transport.pollingGetCount, name: summary.name, controller: summary.controller || null });
      }
      if (process.env.R6_SUPPRESS_GRBL === '1' && fixturesForResponse.length && summary.type === 'event' && summary.controller === 'Grbl' && ['controller:settings', 'controller:state'].includes(summary.name)) {
        result.transport.suppressedGrblControllerEvents += 1;
        result.transport.suppressedEvents.push({ pollingGet: result.transport.pollingGetCount, name: summary.name, controller: 'Grbl' });
        continue;
      }
      kept.push(packet);
    }
    if (fixturesForResponse.length) {
      for (const fixtureForResponse of fixturesForResponse) {
        for (const [event, payload] of fixtureForResponse.events) {
          const packet = `42${JSON.stringify([event, fixtureForResponse.type, payload])}`;
          kept.push(packet);
          const serialized = JSON.stringify(payload);
          result.transport.injected.push({ event, controller: fixtureForResponse.type, payloadBytes: Buffer.byteLength(serialized), payloadSha256: crypto.createHash('sha256').update(serialized).digest('hex'), pollingGet: result.transport.pollingGetCount });
        }
        result.transport.incomingEvents.push({ pollingGet: result.transport.pollingGetCount, name: 'fixture:batch', controller: fixtureForResponse.type, afterActualConnectionOpen: true });
      }
    }
    flush();
    return route.fulfill({ response, body: encodePayload(kept) });
  } catch (error) {
    result.transport.pollingRelayError = sanitizeDiagnostic(error).slice(0, 400);
    flush();
    throw error;
  }
});

page.on('pageerror', error => result.pageErrors.push(sanitizeDiagnostic(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), type: request.resourceType(), error: sanitizeDiagnostic(request.failure()?.errorText || '') }));
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: sanitizeDiagnostic(message.text()).slice(0, 1000) });
});
const decodePayload = payload => {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon <= cursor || !/^\d+$/.test(payload.slice(cursor, colon))) break;
    const length = Number(payload.slice(cursor, colon));
    const start = colon + 1;
    const packet = payload.slice(start, start + length);
    if (packet.length !== length) break;
    packets.push(packet);
    cursor = start + length;
  }
  return packets;
};
function encodePayload(packets) {
  return packets.map(packet => `${Buffer.byteLength(packet)}:${packet}`).join('');
}
function recordPacket(packet, transport) {
  const match = packet.match(/^42\d*(\[.*\])$/s);
  if (!match) return;
  try {
    const [event, ...args] = JSON.parse(match[1]);
    if (!['command', 'write', 'writeln'].includes(event)) return;
    const name = event === 'command' ? String(args[1] || '') : event;
    const payload = event === 'command' ? args[2] : (args[1] ?? args[2]);
    const serialized = payload === undefined ? '' : typeof payload === 'string' ? payload : JSON.stringify(payload);
    result.outgoingCommands.push({ event, name, transport, payloadBytes: Buffer.byteLength(serialized), payloadSha256: crypto.createHash('sha256').update(serialized).digest('hex') });
  } catch (_) { /* Ignore non-command packets. */ }
}
async function gate(name, action) {
  const startedAt = Date.now();
  try {
    const detail = await action();
    result.gates.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(detail || {}) });
  } catch (error) {
    const visibleRegions = await page.locator('[role="region"][aria-label]').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { name: node.getAttribute('aria-label'), display: style.display, visibility: style.visibility, rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, connected: node.isConnected };
    })).catch(() => []);
    result.gates.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: sanitizeDiagnostic(error).slice(0, 1200), visibleRegions });
    await page.screenshot({ path: path.join(artifactDir, `other-controller-failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`), fullPage: true }).catch(() => {});
  }
  flush();
}
async function waitFor(check, label, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await page.waitForTimeout(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
}
function region(name) { return page.getByRole('region', { name, exact: true }); }
async function connectGrbl() {
  const connection = region('Connection widget');
  const close = connection.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) throw new Error('Fresh browser context unexpectedly reports an open simulator connection before observed connection:open');
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await auto.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const port = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await port.waitFor({ state: 'visible', timeout: 45000 });
  const selectedPort = (await port.innerText()).trim();
  await port.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  if (!(await open.isEnabled())) throw new Error('Simulator Open control is disabled');
  await open.click();
  await close.waitFor({ state: 'visible', timeout: 20000 });
  await waitFor(async () => result.transport.incomingEvents.some(event => event.name === 'connection:open'), 'actual forwarded connection:open event', 15000);
  await waitFor(async () => result.transport.injected.length === selectedFixtures.length * 2, 'all controller fixtures appended after connection:open', 15000);
  return { alreadyConnected: false, selectedPort, actualConnectionOpenForwarded: true, fixtureEventsAppended: result.transport.injected.length, pollingGetCount: result.transport.pollingGetCount, websocketUpgradeClosed: result.transport.websocketUpgradeClosed };
}
async function replay(type, state, settings, expectedBodyText) {
  const widget = region(`${type} widget`);
  const info = widget.getByRole('button', { name: `${type} controller info`, exact: true });
  await info.waitFor({ state: 'visible', timeout: 15000 });
  const body = (await widget.innerText()).replace(/\s+/g, ' ');
  for (const expected of expectedBodyText) {
    if (!body.includes(expected)) throw new Error(`${type} controller body did not display ${JSON.stringify(expected)}: ${body.slice(0, 500)}`);
  }
  await info.click();
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible' });
  const stateTab = dialog.getByRole('tab', { name: 'Controller State', exact: true });
  await stateTab.click();
  const stateJson = (await dialog.innerText()).replace(/\s+/g, ' ');
  await dialog.getByRole('tab', { name: 'Controller Settings', exact: true }).click();
  const settingsJson = (await dialog.innerText()).replace(/\s+/g, ' ');
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
  await dialog.waitFor({ state: 'hidden' });
  if (!stateJson.includes(String(state.r6FixtureId))) throw new Error(`${type} controller info did not render the fixture state identifier`);
  if (!settingsJson.includes(String(settings.r6FixtureId))) throw new Error(`${type} controller info did not render the fixture settings identifier`);
  return { bodyExcerpt: body.slice(0, 450), expectedBodyText, stateFixtureIdVisible: true, settingsFixtureIdVisible: true, stateShapeKeys: Object.keys(state), settingsShapeKeys: Object.keys(settings) };
}
async function viewContract(type) {
  const widget = region(`${type} widget`);
  const beforeCommands = result.outgoingCommands.length;
  const collapse = widget.getByRole('button', { name: 'Collapse', exact: true });
  await collapse.waitFor({ state: 'visible' });
  await collapse.click();
  const expand = widget.getByRole('button', { name: 'Expand', exact: true });
  await expand.waitFor({ state: 'visible' });
  const collapsedExpanded = await expand.getAttribute('aria-expanded');
  if (collapsedExpanded !== 'false') throw new Error(`${type} did not expose the collapsed state`);
  await expand.click();
  const collapseAgain = widget.getByRole('button', { name: 'Collapse', exact: true });
  await collapseAgain.waitFor({ state: 'visible' });
  if (await collapseAgain.getAttribute('aria-expanded') !== 'true') throw new Error(`${type} did not restore its expanded state`);
  const more = widget.getByRole('button', { name: 'More options', exact: true });
  await more.click();
  const enter = page.getByRole('menuitem', { name: 'Enter Full Screen', exact: true }).last();
  await enter.waitFor({ state: 'visible' });
  await enter.click();
  await page.waitForFunction(label => {
    const node = [...document.querySelectorAll('[role="region"][aria-label]')].find(item => item.getAttribute('aria-label') === label);
    return node && getComputedStyle(node).position === 'fixed';
  }, `${type} widget`, { timeout: 5000 });
  const fullscreen = await widget.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { position: getComputedStyle(node).position, width: rect.width, height: rect.height };
  });
  await widget.getByRole('button', { name: 'Exit Full Screen', exact: true }).click();
  await page.waitForFunction(label => {
    const node = [...document.querySelectorAll('[role="region"][aria-label]')].find(item => item.getAttribute('aria-label') === label);
    return node && getComputedStyle(node).position !== 'fixed';
  }, `${type} widget`, { timeout: 5000 });
  const commandDelta = result.outgoingCommands.length - beforeCommands;
  if (commandDelta !== 0) throw new Error(`${type} collapse/fullscreen controls sent ${commandDelta} CNC commands`);
  await page.screenshot({ path: path.join(artifactDir, `other-controller-${type.toLowerCase()}-view-r6.png`) });
  return { collapsedExpanded, expandedRestored: true, fullscreen, exited: true, outgoingCommandDelta: commandDelta };
}

const fixtures = [
  {
    type: 'Marlin',
    expectedBodyText: ['Extruder Temperature', '201°C / 220°C'],
    state: { r6FixtureId: 'MARLIN-STATE-R6', feedrate: 1345, spindle: 5500, ovF: 92, ovS: 88, extruder: { deg: 201, degTarget: 220, power: 45 }, heatedBed: { deg: 59, degTarget: 65, power: 17 }, modal: { wcs: 'G55', units: 'G21', motion: 'G1' } },
    settings: { r6FixtureId: 'MARLIN-SETTINGS-R6', baudrate: 250000, max_feedrate: { x: 300 } },
  },
  {
    type: 'Smoothie',
    expectedBodyText: ['Run', '4321'],
    state: { r6FixtureId: 'SMOOTHIE-STATE-R6', status: { machineState: 'Run', ovF: 85, ovS: 70, mpos: { x: 12, y: 34, z: 5 }, wpos: {} }, parserstate: { feedrate: 4321, spindle: 12000, tool: 7, modal: { wcs: 'G55', units: 'G21', motion: 'G1' } } },
    settings: { r6FixtureId: 'SMOOTHIE-SETTINGS-R6', firmware: 'R6-Smoothie-fixture', acceleration: { x: 900, y: 900 } },
  },
  {
    type: 'TinyG',
    expectedBodyText: ['Planner Buffer', '742'],
    state: { r6FixtureId: 'TINYG-STATE-R6', machineState: 5, line: 742, qr: 21, pwr: { x: 0.5, y: 0.75 }, modal: { wcs: 'G56', units: 'G21', motion: 'G1' } },
    settings: { r6FixtureId: 'TINYG-SETTINGS-R6', fv: 1, mfo: 1.25, mto: 1, sso: 0.8 },
  },
];

const selectedFixtures = process.env.R6_CONTROLLER_FILTER
  ? fixtures.filter(fixture => process.env.R6_CONTROLLER_FILTER.split(',').includes(fixture.type))
  : fixtures;
pendingFixtures = selectedFixtures.map(fixture => ({ type: fixture.type, events: [['controller:settings', fixture.settings], ['controller:state', fixture.state]] }));
await page.goto(`${origin}/#/workspace`, { waitUntil: 'domcontentloaded' });
await region('Connection widget').waitFor({ state: 'visible', timeout: 30000 });
await gate('connect actual GRBL simulator through Connection widget', connectGrbl);
for (const fixture of selectedFixtures) {
  await gate(`${fixture.type} controller replay updates body and controller state/settings modal`, async () => {
    const before = result.outgoingCommands.length;
    const detail = await replay(fixture.type, fixture.state, fixture.settings, fixture.expectedBodyText);
    const delta = result.outgoingCommands.length - before;
    if (delta !== 0) throw new Error(`${fixture.type} replay or modal emitted ${delta} CNC commands`);
    return { ...detail, outgoingCommandDelta: delta };
  });
  if (process.env.R6_SKIP_VIEW_CASES !== '1') {
    await gate(`${fixture.type} connected widget collapse and fullscreen view actions`, () => viewContract(fixture.type));
  }
}

await gate('disconnect simulator through Connection widget', async () => {
  const connection = region('Connection widget');
  await connection.getByRole('button', { name: 'Close', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'OK', exact: true });
  await confirm.waitFor({ state: 'visible' });
  await confirm.click();
  await connection.getByRole('button', { name: 'Open', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  return { disconnected: true };
});

await page.screenshot({ path: path.join(artifactDir, 'other-controller-replay-r6-final.png'), fullPage: true });
flush();
const hasFailure = result.gates.some(item => item.status === 'failed') || result.pageErrors.length > 0 || result.requestFailures.length > 0;
fs.writeFileSync(path.join(artifactDir, 'other-controller-replay-r6.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ gates: result.gates, injectedCount: result.transport.injected.length, pageErrors: result.pageErrors.length, requestFailures: result.requestFailures.length, outgoingCommands: result.outgoingCommands.length }, null, 2));
await page.unrouteAll({ behavior: 'ignoreErrors' });
await browser.close();
if (hasFailure) process.exitCode = 1;
