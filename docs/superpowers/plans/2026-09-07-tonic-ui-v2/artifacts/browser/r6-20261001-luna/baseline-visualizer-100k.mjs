import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs');

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const baseUrl = process.env.R6_BASE_URL || 'http://127.0.0.1:8082';
const fixturePath = '/tmp/cncjs-r6-20261001/synthetic-100k.gcode';
const fixture = fs.readFileSync(fixturePath);
const fixtureSha256 = crypto.createHash('sha256').update(fixture).digest('hex');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(12000);
await page.addInitScript(() => {
  window.__r6BaselineInputEvents = [];
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
  baseline: {
    sourceCommit: '0a90e31f90515d711379bad8729f96a068d90718',
    firstEngineExtractionCommit: 'c7ed265f',
    devOnlyInstrumentation: 'Visualizer.load start through first completed visible WebGLRenderer.render; native input timestamp through first subsequent renderer call',
    frontend: baseUrl,
    backend: 'http://127.0.0.1:8000',
  },
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
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
};
const outPath = process.env.R6_RESULT_PATH || path.join(artifactDir, 'baseline-visualizer-100k.json');
function flush() { fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n'); }
function hash(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
page.on('console', message => { if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 500) }); });
page.on('pageerror', error => result.pageErrors.push(String(error).slice(0, 800)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));
page.on('response', response => {
  const url = new URL(response.url());
  if (url.pathname.startsWith('/api/')) result.apiResponses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
});
async function waitUntil(check, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return Date.now() - started;
    await page.waitForTimeout(50);
  }
  throw new Error(`Condition not met within ${timeoutMs} ms`);
}
async function metrics() {
  return page.evaluate(() => window.__R6_BASELINE_METRICS__ || null);
}
async function connect() {
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
async function loadFixture(index) {
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
  const close = page.getByRole('button', { name: 'Close G-code file', exact: true });
  await waitUntil(() => close.isEnabled(), 12000);
  await close.click();
  await waitUntil(() => page.getByRole('button', { name: 'Upload G-code', exact: true }).isEnabled(), 20000);
  return metrics();
}
async function interact(sampleIndex) {
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
    const mode = visualizer.getByRole('button', { name: /Camera mode:/ });
    if (!/Pan/i.test(await mode.getAttribute('aria-label'))) {
      await mode.click();
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
      fs.writeFileSync(path.join(artifactDir, 'baseline-pan-before.png'), beforeImage);
      fs.writeFileSync(path.join(artifactDir, 'baseline-pan-after.png'), await canvas.screenshot());
    }
    result.panSamples.push({ sample: result.panSamples.length + 1, eventToRendererMs: Number((renderedAtMs - event.atMs).toFixed(3)), pixelHashChanged: beforeHash !== afterHash, cameraMode: await mode.getAttribute('aria-label') });
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
  if (result.interactions.length % 10 === 0) flush();
}

try {
  flush();
  await page.goto(`${baseUrl}/#/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor();
  await waitUntil(async () => Boolean(await metrics()), 15000);
  result.connection = await connect();
  result.webgl = await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return gl ? { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR), width: canvas.width, height: canvas.height } : null;
  });
  flush();
  for (let i = 1; i <= 5; i += 1) {
    result.warmLoads.push(await loadFixture(i));
    flush();
    if (result.interactionErrors.length === 0) {
      for (let j = 0; j < 30; j += 1) {
        try { await interact((i * 30 + j) % 9); }
        catch (error) {
          result.interactionErrors.push({ sample: result.interactions.length + 1, error: String(error).slice(0, 800) });
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
  const loadDurations = result.warmLoads.map(sample => sample.metricsLoadSample.durationMs);
  const uiDurations = result.warmLoads.map(sample => sample.uploadToRunEnabledMs);
  const interactionDurations = result.interactions.map(sample => sample.eventToRendererMs);
  const panDurations = result.panSamples.map(sample => sample.eventToRendererMs);
  result.summary = {
    warmLoads: result.warmLoads.length,
    loadToFirstRendererMs: { p50: quantile(loadDurations, 0.5), p95: quantile(loadDurations, 0.95), max: Math.max(...loadDurations) },
    uploadToRunEnabledMs: { p50: quantile(uiDurations, 0.5), p95: quantile(uiDurations, 0.95), max: Math.max(...uiDurations) },
    interactions: result.interactions.length,
    inputToFirstRendererMs: { p50: quantile(interactionDurations, 0.5), p95: quantile(interactionDurations, 0.95), max: Math.max(...interactionDurations) },
    panSamples: result.panSamples.length,
    panInputToRendererMs: { p50: quantile(panDurations, 0.5), p95: quantile(panDurations, 0.95), max: Math.max(...panDurations) },
    canvasSize: result.warmLoads[0]?.engine || null,
  };
  result.completedAt = new Date().toISOString();
  result.status = result.interactionErrors.length === 0 && result.interactions.length === 150 ? 'completed' : 'partial';
  await page.screenshot({ path: path.join(artifactDir, 'baseline-visualizer-100k-final.png'), fullPage: true });
} catch (error) {
  result.status = 'failed';
  result.error = String(error).slice(0, 1500);
  await page.screenshot({ path: path.join(artifactDir, 'baseline-visualizer-100k-failure.png'), fullPage: true }).catch(() => {});
} finally {
  result.finalBaselineMetrics = await metrics().catch(() => null);
  result.finishedAt = new Date().toISOString();
  flush();
  await browser.close();
}
