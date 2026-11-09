import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs');

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const outPath = path.join(artifactDir, 'route-cycles-r6.json');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(12000);
await page.addInitScript(() => {
  const active = { window: 0, document: 0, canvas: 0, element: 0, other: 0 };
  const added = { window: 0, document: 0, canvas: 0, element: 0, other: 0 };
  const removed = { window: 0, document: 0, canvas: 0, element: 0, other: 0 };
  const targets = new WeakMap();
  const targetMetadata = new WeakMap();
  const targetRefs = [];
  const listenerIds = new WeakMap();
  let nextListenerId = 0;
  const category = target => {
    if (target === window) return 'window';
    if (target === document) return 'document';
    if (target instanceof HTMLCanvasElement) return 'canvas';
    if (target instanceof Element) return 'element';
    return 'other';
  };
  const listenerId = listener => {
    if (!listener || (typeof listener !== 'function' && typeof listener !== 'object')) return null;
    if (!listenerIds.has(listener)) listenerIds.set(listener, ++nextListenerId);
    return listenerIds.get(listener);
  };
  const metadata = target => {
    if (target === window) return { category: 'window', tag: 'WINDOW', id: '', role: '', tonic: '' };
    if (target === document) return { category: 'document', tag: 'DOCUMENT', id: '', role: '', tonic: '' };
    const element = target instanceof Element ? target : null;
    return {
      category: category(target),
      tag: element?.tagName || '',
      id: element?.id || '',
      role: element?.getAttribute('role') || '',
      tonic: element?.getAttribute('data-tonic') || '',
    };
  };
  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    const id = listenerId(listener);
    if (id !== null) {
      let registry = targets.get(this);
      if (!registry) {
        registry = new Map();
        targets.set(this, registry);
        targetMetadata.set(this, metadata(this));
        targetRefs.push(new WeakRef(this));
      }
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
      const key = `${type}:${capture}:${id}`;
      if (!registry.has(key)) {
        registry.set(key, type);
        const group = category(this);
        active[group] += 1;
        added[group] += 1;
      }
    }
    return originalAdd.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    const id = listenerId(listener);
    if (id !== null) {
      const registry = targets.get(this);
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
      const key = `${type}:${capture}:${id}`;
      if (registry?.has(key)) {
        registry.delete(key);
        const group = category(this);
        active[group] = Math.max(0, active[group] - 1);
        removed[group] += 1;
      }
    }
    return originalRemove.call(this, type, listener, options);
  };
  window.__r6EventTargetCensus = () => {
    const connectedActive = { window: 0, document: 0, canvas: 0, element: 0, other: 0 };
    const detachedActive = { window: 0, document: 0, canvas: 0, element: 0, other: 0 };
    const targetDetails = {};
    targetRefs.forEach(reference => {
      const target = reference.deref();
      if (!target) return;
      const registry = targets.get(target);
      if (!registry || registry.size === 0) return;
      const info = targetMetadata.get(target);
      const isConnected = target === window || target === document || target.isConnected === true;
      const activeCounts = isConnected ? connectedActive : detachedActive;
      activeCounts[info.category] += registry.size;
      const label = `${info.category}:${info.tag}:id=${info.id}:role=${info.role}:tonic=${info.tonic}:${isConnected ? 'connected' : 'detached'}`;
      const summary = targetDetails[label] || { active: 0, events: {} };
      summary.active += registry.size;
      registry.forEach(eventType => {
        summary.events[eventType] = (summary.events[eventType] || 0) + 1;
      });
      targetDetails[label] = summary;
    });
    return { active: { ...active }, added: { ...added }, removed: { ...removed }, connectedActive, detachedActive, targetDetails };
  };
});

const result = {
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
  routeMethod: 'in-app HashRouter transition from /workspace to authenticated /login; LoginPage redirects to /workspace, causing MainPage/Workspace unmount, engine dispose, then recreation; no document reload',
  cycles: [],
  errors: [],
  consoleIssues: [],
  startedAt: new Date().toISOString(),
};
const flush = () => fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
page.on('pageerror', error => result.errors.push(String(error).slice(0, 800)));
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 400) });
});
async function waitUntil(check, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return Date.now() - started;
    await page.waitForTimeout(50);
  }
  throw new Error(`condition timed out after ${timeoutMs} ms`);
}
async function snapshot() {
  return page.evaluate(() => ({
    route: window.location.hash,
    census: window.__r6EventTargetCensus(),
    metrics: window.__CNCJS_VISUALIZER_METRICS__ || null,
  }));
}
async function setRoute(route) {
  await page.evaluate(nextRoute => { window.location.hash = nextRoute; }, route);
}
function compareActive(first, current) {
  return Object.fromEntries(Object.keys(first).map(key => [key, current[key] - first[key]]));
}

try {
  flush();
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  await visualizer.waitFor();
  await page.waitForFunction(() => Boolean(window.__CNCJS_VISUALIZER_METRICS__), null, { timeout: 15000 });
  await waitUntil(async () => (await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__.liveEngineCount)) === 1);
  result.initial = await snapshot();
  result.initial.activeEventListeners = result.initial.census.active;
  result.initialMetrics = result.initial.metrics;
  await page.screenshot({ path: path.join(artifactDir, 'route-cycles-initial-workspace.png') });
  const firstWorkspaceCensus = result.initial.census;
  for (let index = 1; index <= 20; index += 1) {
    const startMetrics = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
    await setRoute('/login');
    await page.waitForFunction(start => {
      const metrics = window.__CNCJS_VISUALIZER_METRICS__;
      return metrics.disposedTotal === start.disposedTotal + 1
        && metrics.canvasRemovedTotal === start.canvasRemovedTotal + 1
        && metrics.disposeSamples.at(-1)?.activeListenerCount === 0
        && metrics.disposeSamples.at(-1)?.canvasAttached === false;
    }, startMetrics, { timeout: 12000 });
    const afterDispose = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
    await waitUntil(async () => {
      const metrics = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
      return metrics.createdTotal === startMetrics.createdTotal + 1
        && metrics.liveEngineCount === 1 && metrics.liveCanvasCount === 1;
    });
    await visualizer.waitFor({ state: 'visible' });
    await page.waitForTimeout(100);
    const workspace = await snapshot();
    const workspaceDelta = compareActive(firstWorkspaceCensus.active, workspace.census.active);
    const connectedDelta = compareActive(firstWorkspaceCensus.connectedActive, workspace.census.connectedActive);
    const detachedDelta = compareActive(firstWorkspaceCensus.detachedActive, workspace.census.detachedActive);
    const item = {
      cycle: index,
      loginTransition: {
        observedRoute: '#/login',
        disposedDelta: afterDispose.disposedTotal - startMetrics.disposedTotal,
        liveEngineCountAfterDispose: afterDispose.liveEngineCount,
        liveCanvasCountAfterDispose: afterDispose.liveCanvasCount,
        disposeSample: afterDispose.disposeSamples.at(-1),
      },
      workspace: {
        route: workspace.route,
        liveEngineCount: workspace.metrics.liveEngineCount,
        liveCanvasCount: workspace.metrics.liveCanvasCount,
        createdDelta: workspace.metrics.createdTotal - startMetrics.createdTotal,
        disposedDelta: workspace.metrics.disposedTotal - startMetrics.disposedTotal,
        activeListeners: workspace.census.active,
        activeDeltaFromInitial: workspaceDelta,
        connectedListeners: workspace.census.connectedActive,
        connectedDeltaFromInitial: connectedDelta,
        detachedListeners: workspace.census.detachedActive,
        detachedDeltaFromInitial: detachedDelta,
        targetDetails: workspace.census.targetDetails,
        ownedEngineListeners: workspace.metrics.engines[0]?.activeListenerCount,
        activeRaf: workspace.metrics.engines[0]?.activeRafCount,
      },
    };
    result.cycles.push(item);
    flush();
    if (index === 1) await page.screenshot({ path: path.join(artifactDir, 'route-cycles-first-remount.png') });
  }
  result.final = await snapshot();
  result.finalPlateau = {
    liveEngineCount: result.final.metrics.liveEngineCount,
    liveCanvasCount: result.final.metrics.liveCanvasCount,
    createdTotal: result.final.metrics.createdTotal,
    disposedTotal: result.final.metrics.disposedTotal,
    canvasCreatedTotal: result.final.metrics.canvasCreatedTotal,
    canvasRemovedTotal: result.final.metrics.canvasRemovedTotal,
    workspaceListenerDelta: compareActive(firstWorkspaceCensus.active, result.final.census.active),
    connectedListenerDelta: compareActive(firstWorkspaceCensus.connectedActive, result.final.census.connectedActive),
    detachedListenerDelta: compareActive(firstWorkspaceCensus.detachedActive, result.final.census.detachedActive),
    maximumConnectedListenerDelta: Math.max(...result.cycles.map(cycle => Math.max(...Object.values(cycle.workspace.connectedDeltaFromInitial)))),
    maximumDetachedListenerDelta: Math.max(...result.cycles.map(cycle => Math.max(...Object.values(cycle.workspace.detachedDeltaFromInitial))))
  };
  result.completedAt = new Date().toISOString();
  result.status = 'completed';
  await page.screenshot({ path: path.join(artifactDir, 'route-cycles-final-workspace.png') });
} catch (error) {
  result.status = 'failed';
  result.error = String(error).slice(0, 1200);
  await page.screenshot({ path: path.join(artifactDir, 'route-cycles-failure.png'), fullPage: true }).catch(() => {});
} finally {
  result.finishedAt = new Date().toISOString();
  flush();
  await browser.close();
}
