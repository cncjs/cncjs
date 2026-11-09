import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = 'http://127.0.0.1:8080';
const fixturePath = '/tmp/cncjs-r6-20261001/pivot-rectangle.gcode';
const fixture = fs.readFileSync(fixturePath);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: process.env.R6_STORAGE_STATE });
await context.addInitScript(() => {
  window.__r6VisibilityClicks = [];
  document.addEventListener('click', event => {
    const item = event.target instanceof Element ? event.target.closest('[role="menuitem"]') : null;
    const label = item?.textContent?.replace(/\s+/g, ' ').trim();
    if (label === 'Hide Limits' || label === 'Show Limits') {
      window.__r6VisibilityClicks.push({ label, atMs: performance.now(), isTrusted: event.isTrusted, targetTag: event.target.tagName, targetRole: event.target.getAttribute('role') });
    }
  }, true);
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const runId = Date.now();
const profiles = [
  { name: `R6 sequence A ${runId}`, limits: { xmin: 0, xmax: 200, ymin: -100, ymax: 100, zmin: -50, zmax: 50 } },
  { name: `R6 sequence B ${runId}`, limits: { xmin: -100, xmax: 0, ymin: 50, ymax: 100, zmin: -50, zmax: 50 } },
];
const result = {
  browser: { version: browser.version(), channel: 'bundled Chromium', viewport: '1440x900', dpr: 1 },
  fixture: { bytes: fixture.byteLength, sha256: crypto.createHash('sha256').update(fixture).digest('hex'), lines: 7 },
  profiles: profiles.map(({ name, limits }) => ({ name, limits })),
  timeline: [],
  checks: [],
  commands: [],
  pageErrors: [],
  requestFailures: [],
  consoleIssues: [],
};
const output = path.join(artifactDir, 'profile-loaded-visibility-sequence-r6.json');
const sanitize = value => String(value).replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]').replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() { fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); }
function decode(payload) {
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
}
function recordPacket(packet, transport) {
  const match = packet.match(/^42\d*(\[.*\])$/s);
  if (!match) return;
  try {
    const [event, ...args] = JSON.parse(match[1]);
    if (event !== 'command') return;
    const name = typeof args[1] === 'string' ? args[1] : '';
    const payload = args[2];
    const text = typeof payload === 'string' ? payload : '';
    const firstWord = text.trim().split(/\s+/, 1)[0].toUpperCase();
    const category = ['sender_load', 'sender_unload', 'gcode:load', 'gcode:unload', 'watchdir:load'].includes(name)
      ? 'programState'
      : name === 'gcode' && ['?', '$G', '$#', '$$', '$I', '$N'].includes(text.trim())
        ? 'read'
        : name === 'gcode' && ['G20', 'G21', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G90', 'G91'].includes(firstWord)
          ? 'setup'
          : name === 'gcode'
            ? 'motion'
            : 'other';
    const serialized = payload === undefined ? '' : typeof payload === 'string' ? payload : JSON.stringify(payload);
    result.commands.push({ name, category, transport, payloadBytes: Buffer.byteLength(serialized), payloadSha256: crypto.createHash('sha256').update(serialized).digest('hex'), ...(category === 'setup' ? { code: firstWord } : {}) });
  } catch (_) { /* Only Socket.IO command packets are relevant. */ }
}
page.on('request', request => {
  if (request.method() === 'POST' && request.url().includes('/socket.io/')) for (const packet of decode(request.postData() || '')) recordPacket(packet, 'polling');
});
page.on('websocket', socket => socket.on('framesent', frame => { if (typeof frame.payload === 'string') recordPacket(frame.payload, 'websocket'); }));
page.on('pageerror', error => result.pageErrors.push(sanitize(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: sanitize(request.failure()?.errorText || '') }));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: sanitize(message.text()).slice(0, 800) }); });

async function engine() { return page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__?.engines?.[0] || null); }
async function waitFor(predicate, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await predicate();
    if (value) return value;
    await page.waitForTimeout(50);
  }
  throw new Error(`Timed out waiting for ${label}; last engine ${JSON.stringify(await engine())}`);
}
async function fillLimits(limits) {
  for (const [key, label] of Object.entries({ xmin: 'X min', xmax: 'X max', ymin: 'Y min', ymax: 'Y max', zmin: 'Z min', zmax: 'Z max' })) {
    await page.getByLabel(new RegExp(`^${label}`)).fill(String(limits[key]));
  }
}
async function createProfile({ name, limits }) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText('New Machine', { exact: true }).waitFor();
  await page.getByLabel(/^Machine name:/).fill(name);
  await fillLimits(limits);
  await page.getByRole('button', { name: 'Add', exact: true }).last().click();
  await page.getByRole('button', { name, exact: true }).waitFor();
}
async function selectProfile(name) {
  const selector = page.getByRole('button', { name: 'Select machine profile', exact: true });
  await selector.click();
  await page.getByRole('menuitem', { name, exact: true }).click();
  await selector.getByText(name, { exact: true }).waitFor({ state: 'visible' });
  const state = await engine();
  result.timeline.push({ step: `profile:${name}`, atMs: Date.now(), engine: pickEngine(state) });
}
function pickEngine(value) {
  if (!value) return null;
  return Object.fromEntries(['hasGCode', 'width', 'height', 'pivotX', 'pivotY', 'pivotZ', 'gcodeWorldCenterX', 'gcodeWorldCenterY', 'gcodeWorldCenterZ', 'limitsVisible', 'sceneLimitsVisible', 'coordinateSystemVisible', 'sceneCoordinateSystemVisible'].map(key => [key, value[key]]));
}
async function connect() {
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await auto.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const port = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await port.waitFor({ state: 'visible', timeout: 45000 });
  await port.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  if (!(await open.isEnabled())) throw new Error('Simulator Open control was disabled');
  await open.click();
  await connection.getByRole('button', { name: 'Close', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  result.timeline.push({ step: 'actual-simulator-open', atMs: Date.now() });
}
async function loadFixture() {
  const before = await engine();
  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  const upload = visualizer.getByRole('button', { name: 'Upload G-code', exact: true });
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  await upload.click();
  const chooser = await chooserPromise;
  if (chooser) await chooser.setFiles(fixturePath);
  else await visualizer.locator('input[type="file"]').first().setInputFiles(fixturePath);
  await waitFor(async () => { const state = await engine(); return state?.hasGCode && state.renderFrameCount > before.renderFrameCount && state.width > 100 && state.height > 100; }, 'visible loaded G-code render');
  const state = await engine();
  result.timeline.push({ step: 'fixture-loaded-visible', atMs: Date.now(), engine: pickEngine(state) });
}
async function toggleLimits(label) {
  const vis = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  await vis.getByRole('button', { name: '3D View options', exact: true }).click();
  const item = vis.getByRole('menuitem', { name: label, exact: true });
  const before = await item.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { text: node.textContent.trim(), disabled: Boolean(node.disabled), ariaDisabled: node.getAttribute('aria-disabled'), pointerEvents: getComputedStyle(node).pointerEvents, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, hitTarget: hit ? { tag: hit.tagName, role: hit.getAttribute('role'), label: hit.getAttribute('aria-label'), text: hit.textContent.trim().slice(0, 80) } : null };
  });
  const clickCount = await page.evaluate(() => window.__r6VisibilityClicks.length);
  await item.click();
  const nativeClick = await page.evaluate(count => window.__r6VisibilityClicks.slice(count), clickCount);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const afterTwoFrames = await engine();
  await page.waitForTimeout(500);
  const afterSettle = await engine();
  return { label, before, nativeClick, afterTwoFrames: pickEngine(afterTwoFrames), afterSettle: pickEngine(afterSettle), menuStillVisible: await item.isVisible().catch(() => false) };
}
async function deleteProfile(name) {
  const row = page.getByRole('row').filter({ hasText: name }).first();
  if (!(await row.count())) return false;
  await row.locator('label[data-tonic="Checkbox"]').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.waitFor({ state: 'detached' });
  return true;
}

let createdProfiles = false;
let connected = false;
try {
  await page.goto(`${origin}/#/administration/machine-profiles`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
  await createProfile(profiles[0]);
  await createProfile(profiles[1]);
  createdProfiles = true;
  await page.goto(`${origin}/#/workspace`, { waitUntil: 'domcontentloaded' });
  await waitFor(async () => { const e = await engine(); return e?.width > 100 && e?.height > 100; }, 'route-visible Visualizer canvas');
  await connect();
  connected = true;
  await selectProfile(profiles[0].name);
  await loadFixture();
  await selectProfile(profiles[1].name);
  const profileB = await waitFor(async () => { const e = await engine(); return e?.hasGCode && Math.abs(e.pivotX - 30) <= 1e-6 && Math.abs(e.pivotY - 40) <= 1e-6 && Math.abs(e.pivotZ + 1) <= 1e-6 ? e : null; }, 'profile B preserving loaded G-code pivot');
  result.checks.push({ name: 'Profile B switch while loaded preserves real world center and pivot', status: 'passed', profile: profiles[1].name, engine: pickEngine(profileB) });
  await selectProfile(profiles[0].name);
  const beforeCommands = result.commands.length;
  const afterHide = await toggleLimits('Hide Limits');
  result.checks.push({ name: 'Native Hide Limits action with Profile A and loaded G-code', status: afterHide.nativeClick.length && !afterHide.afterSettle?.limitsVisible && !afterHide.afterSettle?.sceneLimitsVisible ? 'passed' : 'failed', ...afterHide });
  if (afterHide.afterSettle?.limitsVisible !== false || afterHide.afterSettle?.sceneLimitsVisible !== false) {
    const afterRetry = await toggleLimits('Hide Limits');
    result.checks.push({ name: 'Single native retry after failed visibility action', status: afterRetry.nativeClick.length && !afterRetry.afterSettle?.limitsVisible && !afterRetry.afterSettle?.sceneLimitsVisible ? 'passed' : 'failed', ...afterRetry });
  }
  const latest = await engine();
  if (latest?.limitsVisible === false) {
    const afterShow = await toggleLimits('Show Limits');
    result.checks.push({ name: 'Restore limits while Profile A and loaded G-code', status: afterShow.nativeClick.length && afterShow.afterSettle?.limitsVisible && afterShow.afterSettle?.sceneLimitsVisible ? 'passed' : 'failed', ...afterShow });
  }
  const visibilityCommands = result.commands.slice(beforeCommands);
  result.checks.push({ name: 'Visibility interaction CNC mutation delta', status: visibilityCommands.length === 0 ? 'passed' : 'failed', commandCount: visibilityCommands.length, commands: visibilityCommands });
  await page.getByRole('button', { name: 'Close G-code file', exact: true }).click();
  const unloaded = await waitFor(async () => { const e = await engine(); return e && !e.hasGCode ? e : null; }, 'G-code unload after visibility sequence');
  result.checks.push({ name: 'G-code unloaded and cached world center cleared', status: unloaded.gcodeWorldCenterX === null && unloaded.gcodeWorldCenterY === null && unloaded.gcodeWorldCenterZ === null ? 'passed' : 'failed', engine: pickEngine(unloaded) });
  await page.screenshot({ path: path.join(artifactDir, 'profile-loaded-visibility-sequence-r6.png'), fullPage: true });
} catch (error) {
  result.status = 'failed';
  result.error = sanitize(error).slice(0, 1200);
  await page.screenshot({ path: path.join(artifactDir, 'profile-loaded-visibility-sequence-failure-r6.png'), fullPage: true }).catch(() => {});
} finally {
  if (connected) {
    try {
      const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
      const close = connection.getByRole('button', { name: 'Close', exact: true });
      if (await close.isVisible().catch(() => false)) {
        await close.click();
        const confirm = page.getByRole('button', { name: 'OK', exact: true });
        if (await confirm.isVisible().catch(() => false)) await confirm.click();
      }
    } catch (_) { /* Simulator workflow has separate disconnect evidence. */ }
  }
  if (createdProfiles) {
    try {
      await page.goto(`${origin}/#/administration/machine-profiles`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ state: 'visible' });
      for (const profile of profiles) await deleteProfile(profile.name);
      result.profileCleanup = 'removed';
    } catch (error) {
      result.profileCleanup = `failed: ${sanitize(error).slice(0, 300)}`;
    }
  }
  flush();
  await browser.close();
}
if (result.status === 'failed' || result.checks.some(check => check.status === 'failed') || result.pageErrors.length || result.requestFailures.length) process.exitCode = 1;
