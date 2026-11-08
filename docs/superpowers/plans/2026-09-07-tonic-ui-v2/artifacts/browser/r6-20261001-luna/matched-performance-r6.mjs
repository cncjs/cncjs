import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs');
const mode = process.env.R6_PERF_MODE;
if (!['baseline', 'current'].includes(mode)) throw new Error('Set R6_PERF_MODE=baseline or current');

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const baseUrl = process.env.R6_BASE_URL || (mode === 'baseline' ? 'http://127.0.0.1:8082' : 'http://127.0.0.1:8080');
const fixturePath = process.env.R6_FIXTURE_PATH || '/tmp/cncjs-r6-20261001/synthetic-100k.gcode';
const fixture = fs.readFileSync(fixturePath);
const fixtureSha256 = crypto.createHash('sha256').update(fixture).digest('hex');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const storageState = process.env.R6_STORAGE_STATE ? JSON.parse(fs.readFileSync(process.env.R6_STORAGE_STATE, 'utf8')) : undefined;
if (storageState) {
  const origin = new URL(baseUrl).origin;
  const state = storageState.origins.find(item => /^http:\/\/(127\.0\.0\.1|localhost):808[02]$/.test(item.origin));
  if (state && !storageState.origins.some(item => item.origin === origin)) storageState.origins.push({ ...state, origin });
}
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', storageState });
const page = await context.newPage();
page.setDefaultTimeout(12000);
await page.addInitScript(() => {
  window.__r6BaselineInputEvents = [];
  window.__r6PerfPhases = [{ name: 'startup', atMs: 0 }];
  window.__r6LongTasks = [];
  window.__r6LongTaskSupported = PerformanceObserver.supportedEntryTypes.includes('longtask');
  if (window.__r6LongTaskSupported) {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const phase = [...window.__r6PerfPhases].reverse().find(item => item.atMs <= entry.startTime);
        window.__r6LongTasks.push({ phase: phase?.name, startTime: entry.startTime, durationMs: entry.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  }
  const record = (type, event) => {
    const button = event.target instanceof Element ? event.target.closest('button[aria-label]') : null;
    if (button && /^(Top View|Front View|Right Side View|Left Side View|3D View|Zoom to Fit|Zoom In|Zoom Out)$/.test(button.getAttribute('aria-label') || '')) {
      window.__r6BaselineInputEvents.push({ type, name: button.getAttribute('aria-label'), atMs: performance.now() });
    }
  };
  document.addEventListener('click', event => record('click', event), true);
  document.addEventListener('mouseup', event => record('mouseup', event), true);
  document.addEventListener('mousemove', event => {
    if (event.target instanceof HTMLCanvasElement) window.__r6BaselineInputEvents.push({ type: 'mousemove', name: 'Canvas Pan', atMs: performance.now() });
  }, true);
});

const result = {
  mode,
  comparison: {
    matchedDrawingArea: { width: 648, height: 284 },
    setup: 'Five prewarm loads/unloads, then five measured loads and 150 native interactions; same script/Chromium flags/theme/DPR.',
  },
  baseline: {
    sourceCommit: '0a90e31f90515d711379bad8729f96a068d90718',
    firstEngineExtractionCommit: 'c7ed265f',
    devOnlyInstrumentation: 'Visualizer.load start through first completed visible WebGLRenderer.render; native input timestamp through first subsequent renderer call',
    frontend: baseUrl,
    backend: 'http://127.0.0.1:8000',
  },
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true, launchArgs: ['--no-sandbox'], systemColorScheme: 'light' },
  fixture: { path: fixturePath, bytes: fixture.byteLength, sha256: fixtureSha256, expectedLines: 100000 },
  startedAt: new Date().toISOString(),
  connection: null,
  webgl: null,
  warmLoads: [],
  interactions: [],
  panSamples: [],
  interactionErrors: [],
  consoleIssues: [],
  pageErrors: [],
  apiResponses: [],
  requestFailures: [],
  cncCommands: [],
  resourceCheckpoints: {},
  prewarmLoads: [],
};
const outPath = process.env.R6_RESULT_PATH || path.join(artifactDir, `matched-performance-${mode}-r6.json`);
function flush() { fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n'); }
function hash(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function sanitizeDiagnostic(value) {
  return String(value)
    .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
}
page.on('console', message => { if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: sanitizeDiagnostic(message.text()).slice(0, 2400) }); });
page.on('pageerror', error => result.pageErrors.push(sanitizeDiagnostic(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: sanitizeDiagnostic(request.failure()?.errorText || '') }));
page.on('response', response => {
  const url = new URL(response.url());
  if (url.pathname.startsWith('/api/')) result.apiResponses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
});
async function setPhase(name) {
  await page.evaluate(name => window.__r6PerfPhases.push({ name, atMs: performance.now() }), name);
}
function recordPacket(packet, transport) {
  const match = packet.match(/^42\d*(\[.*\])$/s);
  if (!match) return;
  try {
    const [event, ...args] = JSON.parse(match[1]);
    if (!['command', 'write', 'writeln'].includes(event)) return;
    const name = event === 'command' ? String(args[1] || '') : event;
    const payload = event === 'command' ? args[2] : args[2] ?? args[1];
    const serialized = payload === undefined ? '' : typeof payload === 'string' ? payload : JSON.stringify(payload);
    const safeReadQueries = new Set(['$G', '$#', '$I', '$N', '$$']);
    const metadata = {
      payloadBytes: Buffer.byteLength(serialized),
      payloadSha256: hash(serialized),
      ...(typeof payload === 'string' && safeReadQueries.has(payload) ? { query: payload } : {})
    };
    result.cncCommands.push({ event, name, transport, ...metadata });
  } catch (_) { /* Ignore unrelated protocol packets. */ }
}
function decodePayload(payload) {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon > cursor && /^\d+$/.test(payload.slice(cursor, colon))) {
      const length = Number(payload.slice(cursor, colon));
      packets.push(payload.slice(colon + 1, colon + 1 + length));
      cursor = colon + 1 + length;
    } else {
      const end = payload.indexOf('\x1e', cursor);
      packets.push(payload.slice(cursor, end < 0 ? payload.length : end));
      if (end < 0) break;
      cursor = end + 1;
    }
  }
  return packets;
}
page.on('request', request => {
  if (request.method() === 'POST' && request.url().includes('/socket.io/')) for (const packet of decodePayload(request.postData() || '')) recordPacket(packet, 'polling');
});
page.on('websocket', socket => socket.on('framesent', frame => {
  if (typeof frame.payload === 'string') recordPacket(frame.payload, 'websocket');
}));
async function waitUntil(check, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return Date.now() - started;
    await page.waitForTimeout(50);
  }
  throw new Error(`Condition not met within ${timeoutMs} ms`);
}
async function metrics() {
  return page.evaluate(mode => {
    if (mode === 'baseline') return window.__R6_BASELINE_METRICS__ || null;
    const value = window.__CNCJS_VISUALIZER_METRICS__;
    return value ? { ...value, pendingLoad: value.engines[0]?.pendingLoadId ?? null } : null;
  }, mode);
}
async function connectBaseline() {
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  const autoWasChecked = await auto.isChecked().catch(() => false);
  if (autoWasChecked) await connection.getByText('Connect automatically', { exact: true }).click();
  const port = connection.locator('[data-test="connection-serial-port"] .connection-serial-port__control');
  await port.waitFor({ state: 'visible', timeout: 45000 });
  const option = connection.locator('.connection-serial-port__option').filter({ hasText: /\/tmp\/ttyGRBL/ });
  const refresh = connection.getByRole('button', { name: 'Refresh', exact: true }).first();
  const started = Date.now();
  let selectedLabel = null;
  while (Date.now() - started < 45000) {
    if (await refresh.isEnabled().catch(() => false)) await refresh.click();
    await page.waitForTimeout(300);
    await port.click();
    if (await option.isVisible().catch(() => false)) {
      selectedLabel = (await option.innerText()).trim();
      await option.click();
      break;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(700);
  }
  if (!selectedLabel) throw new Error('Synthetic simulator did not appear in the baseline serial-port menu after refresh');
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await waitUntil(() => open.isEnabled(), 12000);
  await open.click();
  await connection.getByRole('button', { name: 'Close', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  return { autoWasChecked, selectedLabel, connectionOpen: true };
}
async function connectCurrent() {
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  const autoWasChecked = await auto.isChecked();
  if (autoWasChecked) await connection.getByText('Connect automatically', { exact: true }).click();
  if (await auto.isChecked()) throw new Error('Connect automatically remains enabled');
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  const portButton = connection.getByRole('button', { name: 'Serial port', exact: true });
  let option = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  const queryStarted = Date.now();
  let selectedLabel = null;
  while (Date.now() - queryStarted < 45000) {
    if (await portButton.isEnabled()) {
      await portButton.click();
      if (await option.isVisible().catch(() => false)) {
        selectedLabel = (await option.innerText()).trim();
        await option.click();
        break;
      }
    }
    const refresh = connection.getByRole('button', { name: 'Refresh', exact: true }).first();
    if (await refresh.isEnabled().catch(() => false)) await refresh.click();
    await page.waitForTimeout(1000);
  }
  if (!selectedLabel) throw new Error('Simulator port did not appear in the open serial menu within 45 seconds');
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await waitUntil(() => open.isEnabled(), 12000);
  await open.click();
  await connection.getByRole('button', { name: 'Close', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  return { autoWasChecked, selectedLabel, openVisible: true };
}
async function connect() { return mode === 'baseline' ? connectBaseline() : connectCurrent(); }
async function loadFixture(index) {
  await setPhase(`load-${index}`);
  const before = await metrics();
  if (!before) throw new Error('Baseline render/load metrics are unavailable');
  const beforeLoadCount = before.loadSamples.length;
  const beganAt = Date.now();
  const upload = page.getByRole('button', { name: 'Upload G-code', exact: true });
  await waitUntil(() => upload.isEnabled(), 12000);
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  await upload.click();
  const chooser = await chooserPromise;
  if (chooser) await chooser.setFiles(fixturePath);
  else await page.locator('input[type="file"]').first().setInputFiles(fixturePath);
  const run = page.getByRole('button', { name: 'Run', exact: true });
  const runEnabledElapsedMs = await waitUntil(() => run.isEnabled(), 120000);
  await waitUntil(async () => {
    const sample = await metrics();
    return sample && sample.loadSamples.length > beforeLoadCount && sample.pendingLoad === null;
  }, 60000);
  const loadedMetrics = await metrics();
  const close = page.getByRole('button', { name: 'Close G-code file', exact: true });
  await close.waitFor({ state: 'visible' });
  return {
    index,
    uploadToRunEnabledMs: Date.now() - beganAt,
    runEnabledElapsedMs,
    metricsLoadSample: loadedMetrics.loadSamples.at(-1),
    renderSampleCount: loadedMetrics.renderSamples.length,
    engine: await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height })),
  };
}
async function unloadFixture() {
  await setPhase('unload');
  const close = page.getByRole('button', { name: 'Close G-code file', exact: true });
  await waitUntil(() => close.isEnabled(), 12000);
  await close.click();
  await waitUntil(() => page.getByRole('button', { name: 'Upload G-code', exact: true }).isEnabled(), 20000);
  if (mode === 'current') await waitUntil(async () => !(await metrics()).engines[0]?.hasGCode, 10000);
  return metrics();
}
async function interact(sampleIndex) {
  await setPhase(`interaction-${result.interactions.length + 1}`);
  const commandsBefore = result.cncCommands.length;
  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  const positionOrder = ['top', 'front', 'right', 'left', '3d'];
  const names = { top: 'Top View', front: 'Front View', right: 'Right Side View', left: 'Left Side View', '3d': '3D View' };
  const state = await page.evaluate(() => window.__r6BaselineInteractionState || (window.__r6BaselineInteractionState = { cameraPosition: 'top' }));
  const slot = sampleIndex % 9;
  let action;
  if (slot < 5) {
    const nextPosition = positionOrder[(positionOrder.indexOf(state.cameraPosition) + 1) % positionOrder.length];
    action = { name: names[nextPosition], expectedPosition: nextPosition };
    await page.evaluate(position => { window.__r6BaselineInteractionState.cameraPosition = position; }, nextPosition);
  } else {
    action = { name: ({ 5: 'Zoom In', 6: 'Zoom Out', 7: 'Zoom to Fit', 8: 'Canvas Pan' })[slot], expectedPosition: null };
  }
  if (action.name === 'Canvas Pan') {
    const cameraMode = visualizer.getByRole('button', { name: /Camera mode:/ });
    if (!/Pan/i.test(await cameraMode.getAttribute('aria-label'))) {
      await cameraMode.click();
      await page.getByRole('menuitem', { name: 'Move the camera', exact: true }).click();
    }
    const canvas = visualizer.locator('canvas');
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Baseline Visualizer canvas is not available for pan input');
    const beforeImage = await canvas.screenshot();
    const beforeHash = hash(beforeImage);
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const direction = sampleIndex % 2 === 0 ? 1 : -1;
    await page.mouse.move(x, y);
    const beforeEventCount = await page.evaluate(() => window.__r6BaselineInputEvents.length);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(x + 48 * direction, y + 24 * direction, { steps: 8 });
    await page.mouse.up({ button: 'left' });
    const event = await page.evaluate(count => window.__r6BaselineInputEvents.slice(count).find(item => item.type === 'mousemove' && item.name === 'Canvas Pan'), beforeEventCount);
    if (!event) throw new Error('Baseline canvas drag emitted no native mousemove event');
    await waitUntil(async () => (await metrics()).renderSamples.some(sample => sample.renderedAtMs > event.atMs), 5000);
    const renderedAtMs = (await metrics()).renderSamples.find(sample => sample.renderedAtMs > event.atMs).renderedAtMs;
    const afterHash = hash(await canvas.screenshot());
    if (result.panSamples.length === 0) {
      fs.writeFileSync(path.join(artifactDir, `matched-${mode}-pan-before.png`), beforeImage);
      fs.writeFileSync(path.join(artifactDir, `matched-${mode}-pan-after.png`), await canvas.screenshot());
    }
    result.panSamples.push({ sample: result.panSamples.length + 1, eventToRendererMs: Number((renderedAtMs - event.atMs).toFixed(3)), pixelHashChanged: beforeHash !== afterHash, cameraMode: await cameraMode.getAttribute('aria-label') });
    result.interactions.push({ sample: result.interactions.length + 1, action: action.name, ...result.panSamples.at(-1) });
    if (beforeHash === afterHash) throw new Error('Canvas pixels did not change after baseline pan drag');
  } else {
    const controls = visualizer.getByRole('button', { name: action.name, exact: true });
    const control = action.name === '3D View' ? controls.last() : controls;
    await page.mouse.move(20, 20);
    const beforeEventCount = await page.evaluate(() => window.__r6BaselineInputEvents.length);
    await control.click();
    const eventType = ['Zoom In', 'Zoom Out', 'Zoom to Fit'].includes(action.name) ? 'mouseup' : 'click';
    const event = await page.evaluate(({ count, type, name }) => window.__r6BaselineInputEvents.slice(count).find(item => item.type === type && item.name === name), { count: beforeEventCount, type: eventType, name: action.name });
    if (!event) throw new Error(`No native ${eventType} recorded for baseline ${action.name}`);
    await waitUntil(async () => (await metrics()).renderSamples.some(sample => sample.renderedAtMs > event.atMs), 5000);
    const renderedAtMs = (await metrics()).renderSamples.find(sample => sample.renderedAtMs > event.atMs).renderedAtMs;
    result.interactions.push({ sample: result.interactions.length + 1, action: action.name, eventType: event.type, eventToRendererMs: Number((renderedAtMs - event.atMs).toFixed(3)) });
  }
  if (result.cncCommands.length !== commandsBefore) throw new Error('Visual-only interaction emitted an outgoing command');
  if (result.interactions.length % 10 === 0) flush();
}

try {
  flush();
  await page.goto(`${baseUrl}/#/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor();
  await waitUntil(async () => Boolean(await metrics()), 15000);
  result.connection = await connect();
  result.appAppearance = await page.evaluate(() => {
    const read = element => {
      if (!element) return null;
      const style = getComputedStyle(element);
      return { tag: element.tagName, role: element.getAttribute('role'), name: element.getAttribute('aria-label'), backgroundColor: style.backgroundColor, color: style.color, colorScheme: style.colorScheme };
    };
    const header = document.querySelector('header[aria-label="Application header"]');
    const connection = document.querySelector('[role="region"][aria-label="Connection widget"]');
    return {
      systemPrefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      header: read(header),
      headerButton: read(header?.querySelector('button')),
      connection: read(connection),
      connectionTitle: read(connection?.firstElementChild),
    };
  });
  const canvas = page.getByRole('region', { name: '3D Visualizer widget', exact: true }).locator('canvas');
  await canvas.evaluate(canvas => {
    const host = canvas.parentElement;
    Object.assign(host.style, { width: '648px', minWidth: '648px', maxWidth: '648px', height: '284px', minHeight: '284px', maxHeight: '284px', flex: '0 0 284px' });
    window.dispatchEvent(new Event('resize'));
  });
  await waitUntil(async () => canvas.evaluate(canvas => canvas.width === 648 && canvas.height === 284), 10000);
  result.webgl = await canvas.evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const box = canvas.getBoundingClientRect();
    const host = canvas.parentElement.getBoundingClientRect();
    return gl ? { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), unmaskedRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, vendor: gl.getParameter(gl.VENDOR), width: canvas.width, height: canvas.height, cssWidth: box.width, cssHeight: box.height, hostWidth: host.width, hostHeight: host.height } : null;
  });
  if (!result.webgl || result.webgl.cssWidth !== 648 || result.webgl.cssHeight !== 284 || !result.webgl.unmaskedRenderer) throw new Error('Matched canvas / renderer assertion failed');
  const front = page.getByRole('region', { name: '3D Visualizer widget', exact: true }).getByRole('button', { name: 'Front View', exact: true });
  if (await front.evaluate(node => getComputedStyle(node).pointerEvents !== 'none')) await front.click();
  await page.evaluate(() => { window.__r6BaselineInteractionState = { cameraPosition: 'front' }; });
  for (let i = 1; i <= 5; i += 1) {
    result.prewarmLoads.push(await loadFixture(`prewarm-${i}`));
    await unloadFixture();
  }
  flush();
  for (let i = 1; i <= 5; i += 1) {
    result.warmLoads.push(await loadFixture(i));
    flush();
    if (result.interactionErrors.length === 0) {
      for (let j = 0; j < 30; j += 1) {
        try { await interact((i * 30 + j) % 9); }
        catch (error) {
          result.interactionErrors.push({ sample: result.interactions.length + 1, error: sanitizeDiagnostic(error).slice(0, 800) });
          flush();
          break;
        }
      }
    }
    await unloadFixture();
    flush();
  }
  const quantile = (values, proportion) => {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 0) return null;
    const index = (sorted.length - 1) * proportion;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return Number((sorted[lower] + ((sorted[upper] - sorted[lower]) * (index - lower))).toFixed(3));
  };
  if (mode === 'current' && process.env.R6_SKIP_RESOURCES !== '1') {
    await setPhase('resource-prewarm');
    for (let i = 1; i <= 5; i += 1) { await loadFixture(`resource-warm-${i}`); await unloadFixture(); }
    for (let i = 1; i <= 20; i += 1) {
      await loadFixture(`resource-${i}`);
      const unloaded = await unloadFixture();
      if ([5, 10, 20].includes(i)) result.resourceCheckpoints[i] = unloaded;
      flush();
    }
  }
  await setPhase('final-settle');
  await page.waitForTimeout(250);
  const diagnostics = await page.evaluate(() => ({ longTaskSupported: window.__r6LongTaskSupported, longTasks: window.__r6LongTasks, phases: window.__r6PerfPhases }));
  result.diagnostics = diagnostics;
  const measuredLoadPhases = new Set([1, 2, 3, 4, 5].map(i => `load-${i}`));
  const measuredLongTasks = diagnostics.longTasks.filter(item => measuredLoadPhases.has(item.phase) || item.phase?.startsWith('interaction-'));
  const renderDurations = (await metrics()).renderSamples.filter(sample => diagnostics.phases.some((phase, i) => (measuredLoadPhases.has(phase.name) || phase.name.startsWith('interaction-')) && sample.renderedAtMs >= phase.atMs && sample.renderedAtMs < (diagnostics.phases[i + 1]?.atMs ?? Infinity))).map(item => item.durationMs);
  const loadDurations = result.warmLoads.map(sample => sample.metricsLoadSample.durationMs);
  const uiDurations = result.warmLoads.map(sample => sample.uploadToRunEnabledMs);
  const interactionDurations = result.interactions.map(sample => sample.eventToRendererMs);
  const panDurations = result.panSamples.map(sample => sample.eventToRendererMs);
  result.summary = {
    prewarmLoads: result.prewarmLoads.length,
    warmLoads: result.warmLoads.length,
    rendererDurationMs: { p50: quantile(renderDurations, 0.5), p95: quantile(renderDurations, 0.95), samples: renderDurations.length },
    measuredLongTasks: { count: measuredLongTasks.length, maxMs: Math.max(0, ...measuredLongTasks.map(item => item.durationMs)), totalMs: measuredLongTasks.reduce((sum, item) => sum + item.durationMs, 0), samples: measuredLongTasks },
    loadToFirstRendererMs: { p50: quantile(loadDurations, 0.5), p95: quantile(loadDurations, 0.95), max: Math.max(...loadDurations) },
    uploadToRunEnabledMs: { p50: quantile(uiDurations, 0.5), p95: quantile(uiDurations, 0.95), max: Math.max(...uiDurations) },
    interactions: result.interactions.length,
    inputToFirstRendererMs: { p50: quantile(interactionDurations, 0.5), p95: quantile(interactionDurations, 0.95), max: Math.max(...interactionDurations) },
    panSamples: result.panSamples.length,
    panInputToRendererMs: { p50: quantile(panDurations, 0.5), p95: quantile(panDurations, 0.95), max: Math.max(...panDurations) },
    canvasSize: result.warmLoads[0]?.engine || null,
  };
  result.completedAt = new Date().toISOString();
  result.status = result.interactionErrors.length === 0 && result.interactions.length === 150 && result.pageErrors.length === 0 && result.requestFailures.length === 0 && diagnostics.longTaskSupported ? 'completed' : 'partial';
  await page.screenshot({ path: path.join(artifactDir, `matched-performance-${mode}-final.png`), fullPage: true });
} catch (error) {
  result.status = 'failed';
  result.error = sanitizeDiagnostic(error).slice(0, 1500);
  await page.screenshot({ path: path.join(artifactDir, `matched-performance-${mode}-failure.png`), fullPage: true }).catch(() => {});
} finally {
  result.finalBaselineMetrics = await metrics().catch(() => null);
  result.finishedAt = new Date().toISOString();
  flush();
  await browser.close();
}
