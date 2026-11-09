import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const fixturePath = '/tmp/cncjs-r6-20261001/synthetic-100k.gcode';
const fixture = fs.readFileSync(fixturePath);
const fixtureSha256 = crypto.createHash('sha256').update(fixture).digest('hex');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(12000);
await page.addInitScript(() => {
  window.__r6VisualizerInputEvents = [];
  const record = (type, event) => {
    const button = event.target instanceof Element ? event.target.closest('button[aria-label]') : null;
    if (button && /^(Top View|Front View|Right Side View|Left Side View|3D View|Zoom to Fit|Zoom In|Zoom Out)$/.test(button.getAttribute('aria-label') || '')) {
      window.__r6VisualizerInputEvents.push({ type, name: button.getAttribute('aria-label'), atMs: performance.now() });
    }
  };
  document.addEventListener('click', event => record('click', event), true);
  document.addEventListener('mouseup', event => record('mouseup', event), true);
  document.addEventListener('mousemove', event => {
    if (event.target instanceof HTMLCanvasElement) {
      window.__r6VisualizerInputEvents.push({ type: 'mousemove', name: 'Canvas Pan', atMs: performance.now() });
    }
  }, true);
});
const result = {
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
  fixture: { path: fixturePath, bytes: fixture.byteLength, sha256: fixtureSha256, expectedLines: 100000 },
  startedAt: new Date().toISOString(),
  simulator: { path: '/tmp/ttyGRBL', baudRate: 115200 },
  warmLoads: [],
  interactions: [],
  interactionErrors: [],
  panSamples: [],
  cncCommands: [],
  resourceCycles: [],
  checkpoints: {},
  consoleIssues: [],
  pageErrors: [],
  requestFailures: [],
};
const outPath = process.env.R6_RESULT_PATH || path.join(artifactDir, 'visualizer-100k-r6.json');
function flush() { fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n'); }
function decodeSocketPayload(payload = '') {
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
page.on('console', message => { if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 500) }); });
page.on('pageerror', error => result.pageErrors.push(String(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));
page.on('request', request => {
  if (request.method() !== 'POST' || !request.url().includes('/socket.io/')) return;
  for (const packet of decodeSocketPayload(request.postData() || '')) {
    const match = packet.match(/^42\d*(\[.*\])$/s);
    if (!match) continue;
    try {
      const [event, ...args] = JSON.parse(match[1]);
      if (event === 'command') result.cncCommands.push({ command: args[2] === 'gcode' ? args[3] : args[2] });
    } catch (_) { /* Ignore unrelated Socket.IO packets. */ }
  }
});
async function waitUntil(check, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return Date.now() - started;
    await page.waitForTimeout(100);
  }
  throw new Error(`Condition not met within ${timeoutMs} ms`);
}
async function snapshot() {
  return page.evaluate(() => ({
    metrics: window.__CNCJS_VISUALIZER_METRICS__ || null,
    heap: performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize } : null,
  }));
}
async function connect() {
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
async function loadFixture(phase, index) {
  const before = await snapshot();
  const beforeLoadCount = before.metrics.loadCount;
  const beforeSamples = before.metrics.loadSamples.length;
  const beganAt = Date.now();
  const upload = page.getByRole('button', { name: 'Upload G-code', exact: true });
  await waitUntil(() => upload.isEnabled(), 12000);
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  await upload.click();
  const chooser = await chooserPromise;
  if (chooser) await chooser.setFiles(fixturePath);
  else await page.locator('input[type="file"]').first().setInputFiles(fixturePath);
  const run = page.getByRole('button', { name: 'Run', exact: true });
  const readyMs = await waitUntil(() => run.isEnabled(), 120000);
  await waitUntil(async () => {
    const metrics = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
    return metrics.loadCount > beforeLoadCount && metrics.loadSamples.length > beforeSamples && metrics.engines[0]?.hasGCode;
  }, 60000);
  const loaded = await snapshot();
  const loadSample = loaded.metrics.loadSamples.at(-1);
  return {
    phase, index,
    uploadToRunEnabledMs: Date.now() - beganAt,
    runEnabledElapsedMs: readyMs,
    metricsLoadSample: loadSample,
    metricLoadCount: loaded.metrics.loadCount,
    engine: loaded.metrics.engines[0],
    heap: loaded.heap,
  };
}
async function unloadFixture() {
  const close = page.getByRole('button', { name: 'Close G-code file', exact: true });
  await waitUntil(() => close.isEnabled(), 12000);
  await close.click();
  await waitUntil(async () => {
    const metrics = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
    return !metrics.engines[0]?.hasGCode;
  }, 20000);
  return snapshot();
}
async function interact(sampleIndex) {
  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  const metrics = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
  const position = metrics.engines[0].cameraPosition;
  const cameraPositions = ['top', 'front', 'right', 'left', '3d'];
  const slot = sampleIndex % 9;
  let action;
  if (slot < 5) {
    const nextPosition = cameraPositions[(cameraPositions.indexOf(position) + 1) % cameraPositions.length];
    action = {
      name: ({ top: 'Top View', front: 'Front View', right: 'Right Side View', left: 'Left Side View', '3d': '3D View' })[nextPosition],
      expectedPosition: nextPosition,
    };
  } else {
    action = { name: ({ 5: 'Zoom In', 6: 'Zoom Out', 7: 'Zoom to Fit', 8: 'Canvas Pan' })[slot], expectedPosition: null };
  }
  if (action.name === 'Canvas Pan') {
    if (metrics.engines[0].cameraMode !== 'pan') {
      const mode = visualizer.getByRole('button', { name: /Camera mode:/ });
      await mode.click();
      await page.getByRole('menuitem', { name: 'Move the camera', exact: true }).click();
      await waitUntil(async () => (await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__.engines[0].cameraMode)) === 'pan', 5000);
    }
    const canvas = visualizer.locator('canvas');
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Visualizer canvas is not available for pan input');
    const beforeImage = await canvas.screenshot();
    const beforeHash = crypto.createHash('sha256').update(beforeImage).digest('hex');
    const beforeCommands = result.cncCommands.length;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const direction = sampleIndex % 2 === 0 ? 1 : -1;
    await page.mouse.move(x, y);
    const beforeEventCount = await page.evaluate(() => window.__r6VisualizerInputEvents.length);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(x + 48 * direction, y + 24 * direction, { steps: 8 });
    await page.mouse.up({ button: 'left' });
    const event = await page.evaluate(({ count, name }) => window.__r6VisualizerInputEvents.slice(count).find(item => item.type === 'mousemove' && item.name === name), { count: beforeEventCount, name: 'Canvas Pan' });
    if (!event) throw new Error('Canvas drag emitted no native mousemove event');
    await waitUntil(async () => (await page.evaluate(atMs => window.__CNCJS_VISUALIZER_METRICS__.renderSamples.some(sample => sample.renderedAtMs > atMs), event.atMs)), 5000);
    const renderedAtMs = await page.evaluate(atMs => window.__CNCJS_VISUALIZER_METRICS__.renderSamples.find(sample => sample.renderedAtMs > atMs)?.renderedAtMs, event.atMs);
    const afterImage = await canvas.screenshot();
    const afterHash = crypto.createHash('sha256').update(afterImage).digest('hex');
    if (beforeHash === afterHash) throw new Error('Canvas pixels did not change after pan drag');
    if (result.cncCommands.length !== beforeCommands) throw new Error('Canvas pan emitted a CNC command');
    if (result.panSamples.length === 0) {
      fs.writeFileSync(path.join(artifactDir, 'visualizer-pan-before.png'), beforeImage);
      fs.writeFileSync(path.join(artifactDir, 'visualizer-pan-after.png'), afterImage);
    }
    const pan = { sample: result.panSamples.length + 1, eventType: event.type, eventToRendererMs: Number((renderedAtMs - event.atMs).toFixed(3)), pixelHashChanged: true, cncCommandDelta: 0, cameraMode: metrics.engines[0].cameraMode };
    result.panSamples.push(pan);
    result.interactions.push({ sample: result.interactions.length + 1, action: action.name, ...pan });
    if (result.interactions.length % 10 === 0) flush();
    return;
  }
  const buttons = visualizer.getByRole('button', { name: action.name, exact: true });
  const control = action.name === '3D View' ? buttons.last() : buttons;
  const eventType = ['Zoom In', 'Zoom Out', 'Zoom to Fit'].includes(action.name) ? 'mouseup' : 'click';
  await page.mouse.move(20, 20);
  const beforeEventCount = await page.evaluate(() => window.__r6VisualizerInputEvents.length);
  await control.click();
  const event = await page.evaluate(({ count, type, name }) => window.__r6VisualizerInputEvents.slice(count).find(item => item.type === type && item.name === name), { count: beforeEventCount, type: eventType, name: action.name });
  if (!event) throw new Error(`No native ${eventType} event recorded for ${action.name}`);
  await waitUntil(async () => {
    const current = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
    return (action.expectedPosition === null || current.engines[0].cameraPosition === action.expectedPosition)
      && current.renderSamples.some(sample => sample.renderedAtMs > event.atMs);
  }, 5000);
  const settled = await page.evaluate(atMs => {
    const metrics = window.__CNCJS_VISUALIZER_METRICS__;
    const render = metrics.renderSamples.find(sample => sample.renderedAtMs > atMs);
    return { renderAtMs: render?.renderedAtMs, engine: metrics.engines[0] };
  }, event.atMs);
  const latencyMs = settled.renderAtMs - event.atMs;
  result.interactions.push({ sample: result.interactions.length + 1, action: action.name, eventType, eventToRendererMs: Number(latencyMs.toFixed(3)), cameraPosition: settled.engine.cameraPosition, renderFrameCount: settled.engine.renderFrameCount });
  if (result.interactions.length % 10 === 0) flush();
}
async function cycle(phase, index, checkpointEvery = false) {
  const loaded = await loadFixture(phase, index);
  const unloaded = await unloadFixture();
  const item = {
    phase, index,
    uploadToRunEnabledMs: loaded.uploadToRunEnabledMs,
    metricsLoadSample: loaded.metricsLoadSample,
    loadedEngine: loaded.engine,
    unloadedEngine: unloaded.metrics.engines[0],
    heapLoaded: loaded.heap,
    heapUnloaded: unloaded.heap,
  };
  result[phase === 'warm' ? 'warmLoads' : 'resourceCycles'].push(item);
  if (checkpointEvery) {
    const n = result.resourceCycles.length;
    if ([5, 10, 20].includes(n)) {
      result.checkpoints[n] = { engine: unloaded.metrics.engines[0], metrics: unloaded.metrics, heap: unloaded.heap, at: new Date().toISOString() };
      await page.screenshot({ path: path.join(artifactDir, `visualizer-100k-cycle-${n}.png`) });
    }
  }
  flush();
  return item;
}

try {
  flush();
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor();
  await page.waitForFunction(() => Boolean(window.__CNCJS_VISUALIZER_METRICS__), null, { timeout: 15000 });
  result.connection = await connect();
  result.connectedAt = new Date().toISOString();
  result.webgl = await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return gl ? { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR), width: canvas.width, height: canvas.height } : null;
  });
  flush();
  // Five warm loads and 150 real toolbar interaction samples.
  for (let i = 1; i <= 5; i += 1) {
    result.warmLoads.push(await loadFixture('warm', i));
    flush();
    if (result.interactionErrors.length === 0) {
      for (let j = 0; j < 30; j += 1) {
        try {
          await interact((i * 30 + j) % 9);
        } catch (error) {
          result.interactionErrors.push({ sample: result.interactions.length + 1, error: String(error).slice(0, 800) });
          flush();
          break;
        }
      }
    }
    const unloaded = await unloadFixture();
    result.warmLoads.at(-1).unloadedEngine = unloaded.metrics.engines[0];
    result.warmLoads.at(-1).heapUnloaded = unloaded.heap;
    flush();
  }
  if (process.env.R6_SKIP_RESOURCES !== '1') {
    for (let i = 1; i <= 20; i += 1) await cycle('resource', i, true);
  }
  await page.screenshot({ path: path.join(artifactDir, 'visualizer-100k-r6-final.png'), fullPage: true });
  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    const confirm = page.getByRole('button', { name: 'OK', exact: true });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
  }
  result.completedAt = new Date().toISOString();
  result.status = 'completed';
} catch (error) {
  result.status = 'blocked';
  result.error = String(error).slice(0, 1500);
  await page.screenshot({ path: path.join(artifactDir, 'visualizer-100k-r6-failure.png'), fullPage: true }).catch(() => {});
} finally {
  const final = await snapshot().catch(() => null);
  result.finalSnapshot = final;
  result.finishedAt = new Date().toISOString();
  flush();
  await browser.close();
}
