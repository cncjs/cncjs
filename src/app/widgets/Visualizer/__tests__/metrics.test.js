describe('development visualizer metrics', () => {
  test('publishes copied scalar load/resource snapshots and unregisters disposed engines', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    delete window.__CNCJS_VISUALIZER_METRICS__;
    let metrics;

    try {
      process.env.NODE_ENV = 'development';
      jest.isolateModules(() => {
        metrics = require('../metrics');
      });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    const engine = {};
    const originalRequestAnimationFrame = global.requestAnimationFrame;
    const originalCancelAnimationFrame = global.cancelAnimationFrame;
    let lateFrameCallback;
    const rafCallback = jest.fn();
    global.requestAnimationFrame = jest.fn(callback => {
      lateFrameCallback = callback;
      return 17;
    });
    global.cancelAnimationFrame = jest.fn();
    metrics.registerVisualizerEngine(engine, {
      width: 640,
      height: 480,
      canvasAttached: true,
      listenerCount: 2,
    });
    metrics.recordOwnedListenerDelta(engine, 1);
    metrics.recordOwnedListenerDelta(engine, -1);
    const frameId = metrics.requestOwnedAnimationFrame(engine, rafCallback);
    expect(frameId).toBe(17);
    expect(window.__CNCJS_VISUALIZER_METRICS__.engines[0].activeRafCount).toBe(1);
    metrics.cancelOwnedAnimationFrame(engine, frameId);
    const load = metrics.beginVisualizerLoad(engine, 'synthetic-fixture.gcode');
    const renderCompletedAtMs = load.startedAt + 12.5;
    metrics.recordVisualizerRender(engine, { geometries: 7, textures: 2 }, 2.5, {
      cameraX: 10,
      cameraTargetY: 12,
      cameraDistance: 20,
      cameraZoom: 1.5,
      cameraFov: 35,
      projectionModeOrthographic: true,
      sceneLimitsVisible: false,
      sceneCoordinateSystemVisible: true,
    }, renderCompletedAtMs);

    const firstSnapshot = window.__CNCJS_VISUALIZER_METRICS__;
    expect(firstSnapshot).toMatchObject({
      createdTotal: 1,
      disposedTotal: 0,
      liveEngineCount: 1,
      canvasCreatedTotal: 1,
      loadCount: 1,
      loadSamples: [{
        fixtureId: 'synthetic-fixture.gcode',
        durationMs: 12.5,
        geometries: 7,
        textures: 2,
      }],
      renderSamples: [{ durationMs: 2.5, renderFrameCount: 1, renderedAtMs: renderCompletedAtMs }],
      engines: [{
        width: 640,
        height: 480,
        lastRenderAtMs: expect.any(Number),
        lastRenderDurationMs: 2.5,
        cameraX: 10,
        cameraTargetY: 12,
        cameraDistance: 20,
        cameraZoom: 1.5,
        cameraFov: 35,
        projectionModeOrthographic: true,
        sceneLimitsVisible: false,
        sceneCoordinateSystemVisible: true,
        listenerAddCount: 3,
        listenerRemoveCount: 1,
        activeListenerCount: 2,
        rafRequestCount: 1,
        rafCancelCount: 1,
        activeRafCount: 0,
      }],
    });
    firstSnapshot.engines[0].width = -1;
    expect(window.__CNCJS_VISUALIZER_METRICS__.engines[0].width).toBe(640);

    metrics.recordOwnedListenerDelta(engine, -2);
    metrics.updateVisualizerEngineMetrics(engine, { canvasAttached: false });
    metrics.unregisterVisualizerEngine(engine);

    expect(window.__CNCJS_VISUALIZER_METRICS__).toMatchObject({
      createdTotal: 1,
      disposedTotal: 1,
      liveEngineCount: 0,
      canvasCreatedTotal: 1,
      canvasRemovedTotal: 1,
      liveCanvasCount: 0,
      disposeSamples: [{
        activeListenerCount: 0,
        activeRafCount: 0,
        canvasAttached: false,
      }],
      engines: [],
    });
    expect(JSON.stringify(window.__CNCJS_VISUALIZER_METRICS__)).not.toContain('engine ref');

    const disposedSnapshot = JSON.stringify(window.__CNCJS_VISUALIZER_METRICS__);
    lateFrameCallback(16);
    expect(rafCallback).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(window.__CNCJS_VISUALIZER_METRICS__)).toBe(disposedSnapshot);

    if (originalRequestAnimationFrame) {
      global.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete global.requestAnimationFrame;
    }
    if (originalCancelAnimationFrame) {
      global.cancelAnimationFrame = originalCancelAnimationFrame;
    } else {
      delete global.cancelAnimationFrame;
    }
  });

  test('does not publish an imperative metrics surface outside development', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    delete window.__CNCJS_VISUALIZER_METRICS__;
    let metrics;

    try {
      process.env.NODE_ENV = 'test';
      jest.isolateModules(() => {
        metrics = require('../metrics');
      });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    metrics.registerVisualizerEngine({}, { canvasAttached: true });
    expect(window.__CNCJS_VISUALIZER_METRICS__).toBeUndefined();
  });
});
