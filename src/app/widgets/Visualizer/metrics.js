const metricsEnabled = process.env.NODE_ENV === 'development';
const engineIds = new WeakMap();
const engines = new Map();
const totals = {
  created: 0,
  disposed: 0,
  loadCount: 0,
  loadSamples: [],
  renderSamples: [],
  disposeSamples: [],
  canvasCreated: 0,
  canvasRemoved: 0,
};

let nextEngineId = 0;
let nextLoadId = 0;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function publishSnapshot() {
  if (!metricsEnabled || typeof window === 'undefined') {
    return;
  }

  const snapshot = {
    createdTotal: totals.created,
    disposedTotal: totals.disposed,
    liveEngineCount: engines.size,
    loadCount: totals.loadCount,
    loadSamples: totals.loadSamples.map(sample => ({ ...sample })),
    renderSamples: totals.renderSamples.map(sample => ({ ...sample })),
    disposeSamples: totals.disposeSamples.map(sample => ({ ...sample })),
    canvasCreatedTotal: totals.canvasCreated,
    canvasRemovedTotal: totals.canvasRemoved,
    liveCanvasCount: Array.from(engines.values()).filter(engine => engine.canvasAttached).length,
    engines: Array.from(engines.values(), engine => ({ ...engine })),
  };

  Object.defineProperty(window, '__CNCJS_VISUALIZER_METRICS__', {
    configurable: true,
    enumerable: false,
    get: () => ({
      ...snapshot,
      loadSamples: snapshot.loadSamples.map(sample => ({ ...sample })),
      renderSamples: snapshot.renderSamples.map(sample => ({ ...sample })),
      disposeSamples: snapshot.disposeSamples.map(sample => ({ ...sample })),
      engines: snapshot.engines.map(engine => ({ ...engine })),
    }),
  });
}

/**
 * Register a renderer engine before scene setup so constructor-time resources
 * are included, then publish scalar-only counters. Listener totals cover the engine's TrackballControls
 * start/end/change listeners and ProbeVisualization canvas listeners. The
 * controls' internal canvas/window/document handlers and page/framework
 * callbacks are excluded.
 * @param {object} engine Renderer engine owner
 * @param {{ width?: number, height?: number, canvasAttached?: boolean, listenerCount?: number }} initial
 */
export function registerVisualizerEngine(engine, initial = {}) {
  if (!metricsEnabled || !engine || engineIds.has(engine)) {
    return;
  }

  const id = ++nextEngineId;
  const listenerCount = Number(initial.listenerCount) || 0;
  engineIds.set(engine, id);
  engines.set(id, {
    id,
    width: Number(initial.width) || 0,
    height: Number(initial.height) || 0,
    pivotX: Number(initial.pivotX) || 0,
    pivotY: Number(initial.pivotY) || 0,
    pivotZ: Number(initial.pivotZ) || 0,
    gcodeWorldCenterX: null,
    gcodeWorldCenterY: null,
    gcodeWorldCenterZ: null,
    cameraX: null,
    cameraY: null,
    cameraZ: null,
    cameraRotationX: null,
    cameraRotationY: null,
    cameraRotationZ: null,
    cameraTargetX: null,
    cameraTargetY: null,
    cameraTargetZ: null,
    cameraDistance: null,
    cameraZoom: null,
    cameraFov: null,
    projectionModeOrthographic: null,
    sceneLimitsVisible: null,
    sceneCoordinateSystemVisible: null,
    sceneGridLineNumbersVisible: null,
    sceneCuttingToolVisible: null,
    cameraPosition: initial.cameraPosition || null,
    cameraMode: initial.cameraMode || null,
    projection: initial.projection || null,
    units: initial.units || null,
    hasGCode: initial.hasGCode === true,
    limitsVisible: initial.limitsVisible === true,
    coordinateSystemVisible: initial.coordinateSystemVisible === true,
    gridLineNumbersVisible: initial.gridLineNumbersVisible === true,
    cuttingToolVisible: initial.cuttingToolVisible === true,
    canvasAttached: initial.canvasAttached === true,
    renderFrameCount: 0,
    lastRenderAtMs: 0,
    lastRenderDurationMs: 0,
    geometryCount: 0,
    textureCount: 0,
    listenerAddCount: listenerCount,
    listenerRemoveCount: 0,
    activeListenerCount: listenerCount,
    rafRequestCount: 0,
    rafCompleteCount: 0,
    rafCancelCount: 0,
    activeRafCount: 0,
    pendingLoadId: null,
  });
  totals.created += 1;
  if (initial.canvasAttached === true) {
    totals.canvasCreated += 1;
  }
  publishSnapshot();
}

/**
 * Update a whitelist of renderer-owned scalar fields without retaining runtime
 * objects in the browser-visible metrics snapshot.
 * @param {object} engine Renderer engine owner
 * @param {object} values Scalar metrics
 */
export function updateVisualizerEngineMetrics(engine, values = {}) {
  if (!metricsEnabled || !engine) {
    return;
  }
  const id = engineIds.get(engine);
  const snapshot = engines.get(id);
  if (!snapshot) {
    return;
  }

  ['width', 'height', 'canvasAttached', 'renderFrameCount', 'geometryCount', 'textureCount', 'pivotX', 'pivotY', 'pivotZ', 'gcodeWorldCenterX', 'gcodeWorldCenterY', 'gcodeWorldCenterZ', 'cameraX', 'cameraY', 'cameraZ', 'cameraRotationX', 'cameraRotationY', 'cameraRotationZ', 'cameraTargetX', 'cameraTargetY', 'cameraTargetZ', 'cameraDistance', 'cameraZoom', 'cameraFov', 'projectionModeOrthographic', 'sceneLimitsVisible', 'sceneCoordinateSystemVisible', 'sceneGridLineNumbersVisible', 'sceneCuttingToolVisible', 'cameraPosition', 'cameraMode', 'projection', 'units', 'hasGCode', 'limitsVisible', 'coordinateSystemVisible', 'gridLineNumbersVisible', 'cuttingToolVisible']
    .forEach(key => {
      const value = values[key];
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string' || value === null) {
        if (key === 'canvasAttached' && snapshot.canvasAttached !== value) {
          if (value) {
            totals.canvasCreated += 1;
          } else {
            totals.canvasRemoved += 1;
          }
        }
        snapshot[key] = value;
      }
    });
  publishSnapshot();
}

/**
 * Track changes to listeners owned by the visualizer engine, excluding page
 * callbacks and listeners installed by browser or React internals.
 * @param {object} engine Renderer engine owner
 * @param {number} delta Positive on add, negative on remove
 */
export function recordOwnedListenerDelta(engine, delta) {
  if (!metricsEnabled || !engine || !Number.isFinite(delta) || delta === 0) {
    return;
  }
  const snapshot = engines.get(engineIds.get(engine));
  if (!snapshot) {
    return;
  }
  if (delta > 0) {
    snapshot.listenerAddCount += delta;
  } else {
    snapshot.listenerRemoveCount += Math.abs(delta);
  }
  snapshot.activeListenerCount = Math.max(0, snapshot.activeListenerCount + delta);
  publishSnapshot();
}

/** @param {object} engine Renderer engine owner */
export function requestOwnedAnimationFrame(engine, callback) {
  if (!metricsEnabled) {
    return requestAnimationFrame(callback);
  }
  const snapshot = metricsEnabled && engine ? engines.get(engineIds.get(engine)) : null;
  if (snapshot) {
    snapshot.rafRequestCount += 1;
    snapshot.activeRafCount += 1;
    publishSnapshot();
  }
  return requestAnimationFrame((...args) => {
    if (snapshot) {
      snapshot.rafCompleteCount += 1;
      snapshot.activeRafCount = Math.max(0, snapshot.activeRafCount - 1);
      publishSnapshot();
    }
    callback(...args);
  });
}

/**
 * Cancel one renderer-owned animation frame; app/page animation callbacks are
 * intentionally excluded from these counters.
 * @param {object} engine Renderer engine owner
 * @param {number} frameId Animation frame identifier
 */
export function cancelOwnedAnimationFrame(engine, frameId) {
  if (frameId === null || frameId === undefined || typeof cancelAnimationFrame !== 'function') {
    return;
  }
  cancelAnimationFrame(frameId);
  if (!metricsEnabled || !engine) {
    return;
  }
  const snapshot = engines.get(engineIds.get(engine));
  if (!snapshot) {
    return;
  }
  snapshot.rafCancelCount += 1;
  snapshot.activeRafCount = Math.max(0, snapshot.activeRafCount - 1);
  publishSnapshot();
}

/**
 * Begin timing a synchronous G-code parse/load through its first visible render.
 * Only the fixture name is retained; G-code content is never exposed.
 * @param {object} engine Renderer engine owner
 * @param {string} fixtureId Display name or synthetic fixture identifier
 * @returns {{ id: number, startedAt: number }|null}
 */
export function beginVisualizerLoad(engine, fixtureId) {
  if (!metricsEnabled || !engine) {
    return null;
  }
  const id = engineIds.get(engine);
  const snapshot = engines.get(id);
  if (!snapshot) {
    return null;
  }
  const token = { id: ++nextLoadId, startedAt: now() };
  snapshot.pendingLoadId = token.id;
  snapshot.pendingLoadStartedAt = token.startedAt;
  snapshot.pendingLoadFixtureId = String(fixtureId || 'unnamed');
  publishSnapshot();
  return token;
}

/**
 * Capture renderer.info.memory after an actual render and close a pending load
 * sample only after its first visible render has completed.
 * @param {object} engine Renderer engine owner
 * @param {{ geometries?: number, textures?: number }} memory
 * @param {number} durationMs Duration of the renderer.render call
 */
export function recordVisualizerRender(engine, memory = {}, durationMs = 0, sceneMetrics = {}, renderCompletedAtMs) {
  if (!metricsEnabled || !engine) {
    return;
  }
  const snapshot = engines.get(engineIds.get(engine));
  if (!snapshot) {
    return;
  }
  snapshot.renderFrameCount += 1;
  snapshot.lastRenderAtMs = Number.isFinite(renderCompletedAtMs) ? renderCompletedAtMs : now();
  snapshot.lastRenderDurationMs = Math.max(0, Number(durationMs) || 0);
  totals.renderSamples.push({
    engineId: snapshot.id,
    renderedAtMs: snapshot.lastRenderAtMs,
    durationMs: snapshot.lastRenderDurationMs,
    renderFrameCount: snapshot.renderFrameCount,
  });
  totals.renderSamples = totals.renderSamples.slice(-1000);
  if (typeof memory.geometries === 'number') {
    snapshot.geometryCount = memory.geometries;
  }
  if (typeof memory.textures === 'number') {
    snapshot.textureCount = memory.textures;
  }
  [
    'cameraX', 'cameraY', 'cameraZ',
    'cameraRotationX', 'cameraRotationY', 'cameraRotationZ',
    'cameraTargetX', 'cameraTargetY', 'cameraTargetZ',
    'cameraDistance', 'cameraZoom', 'cameraFov', 'projectionModeOrthographic',
    'sceneLimitsVisible', 'sceneCoordinateSystemVisible',
    'sceneGridLineNumbersVisible', 'sceneCuttingToolVisible',
  ].forEach(key => {
    const value = sceneMetrics[key];
    if (typeof value === 'number' || typeof value === 'boolean') {
      snapshot[key] = value;
    }
  });
  if (snapshot.pendingLoadId !== null) {
    const durationMs = Math.max(0, snapshot.lastRenderAtMs - snapshot.pendingLoadStartedAt);
    totals.loadCount += 1;
    totals.loadSamples.push({
      fixtureId: snapshot.pendingLoadFixtureId,
      durationMs,
      renderFrameCount: snapshot.renderFrameCount,
      geometries: snapshot.geometryCount,
      textures: snapshot.textureCount,
      engineId: snapshot.id,
    });
    totals.loadSamples = totals.loadSamples.slice(-100);
    snapshot.pendingLoadId = null;
    delete snapshot.pendingLoadStartedAt;
    delete snapshot.pendingLoadFixtureId;
  }
  publishSnapshot();
}

/** @param {object} engine Renderer engine owner */
export function cancelVisualizerLoad(engine) {
  if (!metricsEnabled || !engine) {
    return;
  }
  const snapshot = engines.get(engineIds.get(engine));
  if (!snapshot || snapshot.pendingLoadId === null) {
    return;
  }
  snapshot.pendingLoadId = null;
  delete snapshot.pendingLoadStartedAt;
  delete snapshot.pendingLoadFixtureId;
  publishSnapshot();
}

/** @param {object} engine Renderer engine owner */
export function unregisterVisualizerEngine(engine) {
  if (!metricsEnabled || !engine) {
    return;
  }
  const id = engineIds.get(engine);
  if (!engines.has(id)) {
    return;
  }
  const snapshot = engines.get(id);
  if (snapshot.canvasAttached) {
    totals.canvasRemoved += 1;
  }
  totals.disposeSamples.push({
    engineId: id,
    activeListenerCount: snapshot.activeListenerCount,
    activeRafCount: snapshot.activeRafCount,
    canvasAttached: snapshot.canvasAttached,
  });
  totals.disposeSamples = totals.disposeSamples.slice(-100);
  engines.delete(id);
  engineIds.delete(engine);
  totals.disposed += 1;
  publishSnapshot();
}
