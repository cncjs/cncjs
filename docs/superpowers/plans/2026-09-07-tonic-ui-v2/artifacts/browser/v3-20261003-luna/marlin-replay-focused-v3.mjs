import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = process.env.V3_BASE_URL || 'http://127.0.0.1:8080';
const theme = process.env.V3_MARLIN_THEME || 'light';
const resultFile = process.env.V3_RESULT_FILE || 'marlin-replay-focused-v3.json';
const progressFile = process.env.V3_PROGRESS_FILE || 'marlin-replay-focused-v3-progress.json';
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tableSourceSha256 = createHash('sha256').update(fs.readFileSync(path.resolve(process.cwd(), 'src/app/pages/Administration/table/useResourceTable.js'))).digest('hex');
const visualizerSourceSha256 = createHash('sha256').update(fs.readFileSync(path.resolve(process.cwd(), 'src/app/widgets/Visualizer/index.jsx'))).digest('hex');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' }).trim();
const dirtySourceFiles = execFileSync('git', ['status', '--short', 'src'], { cwd: process.cwd(), encoding: 'utf8' }).split('\n').filter(Boolean).map(entry => entry.slice(3));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: theme,
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(30000);

const result = {
  task: 'V3-V focused Marlin controller visual replay',
  revision,
  theme,
  runnerPid: process.pid,
  sourceContext: { dirtySourceFiles, tableSourceSha256, visualizerSourceSha256, fixture: 'R6 incoming state/settings fixture replay filtered to one active controller only; fresh empty browser context' },
  browser: { version: browser.version(), channel: 'Playwright bundled Chromium', headless: true, viewport: '1440x900', dpr: 1 },
  transport: { method: 'Socket.IO Engine.IO v3 polling response relay with synthetic incoming controller events appended after the actual connection:open event', injected: [], pollingGetCount: 0, websocketUpgradeClosed: 0, suppressedGrblControllerEvents: 0, incomingEvents: [], suppressedEvents: [] },
  gates: [],
  pageErrors: [],
  requestFailures: [],
  consoleIssues: [],
  outgoingCommands: [],
};
const flush = () => fs.writeFileSync(path.join(artifactDir, progressFile), `${JSON.stringify(result, null, 2)}\n`);
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
    await page.screenshot({ path: path.join(artifactDir, `marlin-replay-failure-${slug(name)}-${theme}-v3.png`), fullPage: true, animations: 'disabled', timeout: 5000 }).catch(() => {});
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
async function setTheme() {
  const toggle = page.locator('header[aria-label="Application header"] button[aria-haspopup="menu"]').last();
  await toggle.click();
  await page.getByRole('menuitem', { name: /Appearance:/ }).click();
  await page.getByText(theme === 'light' ? 'Light theme' : 'Dark theme', { exact: true }).last().click();
  await page.waitForTimeout(160);
}
async function replay(type, state, settings, expectedBodyText) {
  const widget = region(`${type} widget`);
  const expand = widget.getByRole('button', { name: 'Expand', exact: true });
  if (await expand.isVisible().catch(() => false)) await expand.click();
  await widget.getByRole('button', { name: 'Collapse', exact: true }).waitFor({ state: 'visible' });
  await widget.scrollIntoViewIfNeeded();
  const info = widget.getByRole('button', { name: `${type} controller info`, exact: true });
  await info.waitFor({ state: 'visible', timeout: 15000 });
  const body = (await widget.innerText()).replace(/\s+/g, ' ');
  for (const expected of expectedBodyText) {
    if (!body.includes(expected)) throw new Error(`${type} controller body did not display ${JSON.stringify(expected)}: ${body.slice(0, 500)}`);
  }
  const visualEvidence = await widget.evaluate(node => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    };
    const rect = node.getBoundingClientRect();
    const icons = [...node.querySelectorAll('svg')].filter(visible).map(svg => {
      const bounds = svg.getBoundingClientRect();
      const style = getComputedStyle(svg);
      return { found: true, ariaLabel: svg.getAttribute('aria-label'), title: svg.querySelector('title')?.textContent || null, dataIcon: svg.getAttribute('data-icon'), fillAttribute: svg.getAttribute('fill'), computedFill: style.fill, computedStroke: style.stroke, color: style.color, rect: { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) } };
    }).slice(0, 30);
    const visibleTextLeaves = [...node.querySelectorAll('*')].filter(element => element.children.length === 0 && visible(element) && (element.textContent || '').trim()).map(element => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      let background = 'rgb(255, 255, 255)';
      for (let parent = element; parent && parent !== node.parentElement; parent = parent.parentElement) {
        const candidate = getComputedStyle(parent).backgroundColor;
        if (candidate && candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') { background = candidate; break; }
      }
      return { found: true, text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 100), color: style.color, background, fontSize: style.fontSize, rect: { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) } };
    }).slice(0, 50);
    const warnings = [...node.querySelectorAll('[data-tonic="Badge"], [role="status"], [role="alert"], [aria-label*="warning" i], [title*="warning" i]')].filter(visible).map(element => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { tag: element.tagName, role: element.getAttribute('role'), text: element.innerText?.trim().replace(/\s+/g, ' ').slice(0, 120) || '', ariaLabel: element.getAttribute('aria-label'), title: element.getAttribute('title'), backgroundColor: style.backgroundColor, color: style.color, borderColor: style.borderColor, rect: { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) } };
    }).slice(0, 20);
    return { rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, visibleTextLeaves, icons, warningIndicators: warnings };
  });
  const screenshot = `controller-${slug(type)}-${theme}-1440x900.png`;
  await page.screenshot({ path: path.join(artifactDir, 'screenshots', screenshot), animations: 'disabled', caret: 'hide', timeout: 5000 });
  if (!visualEvidence.visibleTextLeaves.length || visualEvidence.visibleTextLeaves.some(sample => sample.found !== true || !sample.color) || !visualEvidence.icons.length || visualEvidence.icons.some(icon => icon.found !== true || !icon.color || !icon.computedFill)) throw new Error(`${type} theme ${theme} did not yield visible body text and resolved semantic icon/text colors`);
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
  return { bodyExcerpt: body.slice(0, 450), expectedBodyText, visibleBodyValuesFound: expectedBodyText.every(expected => body.includes(expected)), stateFixtureIdVisible: true, settingsFixtureIdVisible: true, stateShapeKeys: Object.keys(state), settingsShapeKeys: Object.keys(settings), screenshot, visualEvidence };
}
async function inspectLiveGrbl() {
  await waitFor(async () => result.transport.incomingEvents.some(event => event.name === 'controller:state' && event.controller === 'Grbl'), 'real simulator Grbl state event', 12000);
  await waitFor(async () => result.transport.incomingEvents.some(event => event.name === 'controller:settings' && event.controller === 'Grbl'), 'real simulator Grbl settings event', 12000);
  const widget = region('Grbl widget');
  const expand = widget.getByRole('button', { name: 'Expand', exact: true });
  if (await expand.isVisible().catch(() => false)) await expand.click();
  await widget.getByRole('button', { name: 'Collapse', exact: true }).waitFor({ state: 'visible' });
  await widget.scrollIntoViewIfNeeded();
  const body = (await widget.innerText()).replace(/\s+/g, ' ').trim();
  const visualEvidence = await widget.evaluate(node => {
    const visible = element => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0; };
    const visibleTextLeaves = [...node.querySelectorAll('*')].filter(element => element.children.length === 0 && visible(element) && (element.textContent || '').trim()).map(element => ({ found: true, text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 100), color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor, fontSize: getComputedStyle(element).fontSize })).slice(0, 50);
    const icons = [...node.querySelectorAll('svg')].filter(visible).map(svg => { const style = getComputedStyle(svg); return { found: true, dataIcon: svg.getAttribute('data-icon'), fillAttribute: svg.getAttribute('fill'), computedFill: style.fill, computedStroke: style.stroke, color: style.color }; }).slice(0, 30);
    const rect = node.getBoundingClientRect();
    return { rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, visibleTextLeaves, icons };
  });
  const screenshot = `controller-grbl-${theme}-1440x900.png`;
  await page.screenshot({ path: path.join(artifactDir, 'screenshots', screenshot), animations: 'disabled', caret: 'hide', timeout: 5000 });
  if (body.length < 20 || !visualEvidence.visibleTextLeaves.length || visualEvidence.visibleTextLeaves.some(sample => sample.found !== true || !sample.color) || !visualEvidence.icons.length || visualEvidence.icons.some(icon => icon.found !== true || !icon.color || !icon.computedFill)) throw new Error('Live Grbl simulator widget did not expose state text and resolved semantic text/icon colors');
  const stateAndSettings = result.transport.incomingEvents.filter(event => event.controller === 'Grbl' && ['controller:state', 'controller:settings'].includes(event.name)).map(event => event.name);
  return { source: 'actual owned synthetic Grbl simulator, not an injected R6 fixture', stateAndSettingsEvents: stateAndSettings, visibleBodyValues: body.slice(0, 500), screenshot, visualEvidence };
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
  await page.screenshot({ path: path.join(artifactDir, 'screenshots', `controller-${slug(type)}-${theme}-view-1440x900.png`), animations: 'disabled', caret: 'hide', timeout: 5000 });
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

const selectedFixtures = process.env.V3_CONTROLLER_FILTER
  ? fixtures.filter(fixture => process.env.V3_CONTROLLER_FILTER.split(',').includes(fixture.type))
  : fixtures;
const liveGrblCase = process.env.V3_CONTROLLER_FILTER?.trim() === 'Grbl';
if (process.env.V3_REQUIRE_SINGLE_FIXTURE === '1' && selectedFixtures.length !== 1 && !(liveGrblCase && selectedFixtures.length === 0)) throw new Error(`Controller/theme case requires exactly one active controller fixture (or actual live Grbl); selected: ${selectedFixtures.map(fixture => fixture.type).join(',') || '(none)'}`);
pendingFixtures = selectedFixtures.map(fixture => ({ type: fixture.type, events: [['controller:settings', fixture.settings], ['controller:state', fixture.state]] }));
await page.goto(`${origin}/#/workspace`, { waitUntil: 'domcontentloaded' });
const showLeftPanel = page.getByRole('button', { name: 'Show left panel', exact: true });
if (await showLeftPanel.isVisible().catch(() => false)) await showLeftPanel.click();
await region('Connection widget').waitFor({ state: 'visible', timeout: 30000 });
await setTheme();
result.browser.environment = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  return { colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', devicePixelRatio, webgl: gl ? { vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } : null, webgpuAvailable: Boolean(navigator.gpu) };
});
await gate('connect actual GRBL simulator through Connection widget', connectGrbl);
for (const fixture of selectedFixtures) {
  await gate(`${fixture.type} controller replay updates body and controller state/settings modal`, async () => {
    const before = result.outgoingCommands.length;
    const detail = await replay(fixture.type, fixture.state, fixture.settings, fixture.expectedBodyText);
    const delta = result.outgoingCommands.length - before;
    if (delta !== 0) throw new Error(`${fixture.type} replay or modal emitted ${delta} CNC commands`);
    return { ...detail, outgoingCommandDelta: delta };
  });
  if (process.env.V3_SKIP_VIEW_CASES !== '1') {
    await gate(`${fixture.type} connected widget collapse and fullscreen view actions`, () => viewContract(fixture.type));
  }
}
if (liveGrblCase) {
  await gate('live Grbl simulator state/settings and semantic widget colors', inspectLiveGrbl);
  if (process.env.V3_SKIP_VIEW_CASES !== '1') await gate('Grbl connected widget collapse and fullscreen view actions', () => viewContract('Grbl'));
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

await page.screenshot({ path: path.join(artifactDir, 'screenshots', `controller-${selectedFixtures.map(fixture => slug(fixture.type)).join('-') || 'none'}-${theme}-final-1440x900.png`), fullPage: true, animations: 'disabled', caret: 'hide', timeout: 5000 });
flush();
const hasFailure = result.gates.some(item => item.status === 'failed') || result.pageErrors.length > 0 || result.requestFailures.length > 0;
result.status = hasFailure ? 'failed' : 'passed';
result.completedAt = new Date().toISOString();
fs.writeFileSync(path.join(artifactDir, resultFile), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ gates: result.gates, injectedCount: result.transport.injected.length, pageErrors: result.pageErrors.length, requestFailures: result.requestFailures.length, outgoingCommands: result.outgoingCommands.length }, null, 2));
await page.unrouteAll({ behavior: 'ignoreErrors' });
await browser.close();
if (hasFailure) process.exitCode = 1;
