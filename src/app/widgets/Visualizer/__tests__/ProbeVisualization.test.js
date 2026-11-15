import ProbeVisualization from '../ProbeVisualization';
import { createVisualizerEngine } from '../VisualizerEngine';
import * as metrics from '../metrics';

const mockRenderer = {
  clear: jest.fn(),
  domElement: document.createElement('canvas'),
  dispose: jest.fn(),
  render: jest.fn(),
  setClearColor: jest.fn(),
  setPixelRatio: jest.fn(),
  setSize: jest.fn(),
  shadowMap: {},
};

jest.mock('three', () => {
  const actual = jest.requireActual('three');
  return {
    ...actual,
    WebGLRenderer: jest.fn(() => mockRenderer),
  };
});

jest.mock('@app/lib/three/TrackballControls', () => {
  const mockThree = jest.requireActual('three');
  return jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    dispose: jest.fn(),
    enabled: true,
    handleResize: jest.fn(),
    noPan: false,
    noZoom: false,
    object: { position: new mockThree.Vector3(), up: new mockThree.Vector3() },
    panSpeed: 1,
    removeEventListener: jest.fn(),
    reset: jest.fn(),
    setMouseButtonState: jest.fn(),
    target: new mockThree.Vector3(),
    update: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
  }));
});

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
}));

jest.mock('@app/lib/three/WebGL', () => ({
  isWebGLAvailable: jest.fn(() => true),
}));

jest.mock('../helpers', () => {
  const actual = jest.requireActual('../helpers');
  return {
    ...actual,
    loadSTL: jest.fn(() => new Promise(() => {})),
    loadTexture: jest.fn(() => new Promise(() => {})),
  };
});

const grid = {
  startX: 0,
  startY: 0,
  endX: 25,
  endY: 35,
  stepX: 10,
  stepY: 10,
  interactable: true,
};

const expectLabels = (visualization, start, end, visible = true) => {
  expect(visualization.pathStartLabel).not.toBeNull();
  expect(visualization.pathEndLabel).not.toBeNull();
  expect(visualization.pathStartLabel.position).toMatchObject({ x: start[0], y: start[1], z: 0 });
  expect(visualization.pathEndLabel.position).toMatchObject({ x: end[0], y: end[1], z: 0 });
  expect(visualization.pathStartLabel.visible).toBe(visible);
  expect(visualization.pathEndLabel.visible).toBe(visible);
};

describe('ProbeVisualization scan endpoints', () => {
  let engine;
  let addEventListener;
  let removeEventListener;
  let listenerDelta;

  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      fillText: jest.fn(),
      measureText: () => ({ width: 10 }),
    }));
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext.mockRestore();
  });

  beforeEach(() => {
    mockRenderer.shadowMap = {};
    addEventListener = jest.spyOn(mockRenderer.domElement, 'addEventListener');
    removeEventListener = jest.spyOn(mockRenderer.domElement, 'removeEventListener');
    listenerDelta = jest.spyOn(metrics, 'recordOwnedListenerDelta');
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 480 });
    engine = createVisualizerEngine({
      container,
      viewState: {
        cameraMode: 'rotate',
        cameraPosition: '3d',
        projection: 'perspective',
        units: 'metric',
        show: true,
      },
    });
  });

  afterEach(() => {
    engine.dispose();
    addEventListener.mockRestore();
    removeEventListener.mockRestore();
    listenerDelta.mockRestore();
  });

  test('creates labels for valid constructor config and defers them for an invalid grid', () => {
    const valid = new ProbeVisualization([], {
      ...grid,
      scanPattern: 'spiral-out',
      scanDirection: 'x',
    });
    const invalid = new ProbeVisualization([], { ...grid, stepX: '' });

    try {
      expectLabels(valid, [7.5, 15], [2.5, 5]);
      expect(invalid.getPathEndpoints()).toEqual({ start: null, end: null });
      expect(invalid.pathStartLabel).toBeNull();
      expect(invalid.pathEndLabel).toBeNull();

      invalid.config.stepX = 10;
      invalid.updateBounds(grid.startX, grid.startY, grid.endX, grid.endY);
      expectLabels(invalid, [-2.5, -5], [22.5, 35]);
    } finally {
      valid.dispose();
      invalid.dispose();
    }
  });

  test('moves actual labels with pattern, bounds, step and direction updates', () => {
    const visualization = engine.probeVisualization;
    expect(visualization.pathStartLabel).toBeNull();
    expect(visualization.pathEndLabel).toBeNull();

    engine.showProbe({ config: grid });
    expect(visualization.config).toMatchObject({ scanPattern: 'raster', scanDirection: 'x' });
    expectLabels(visualization, [-2.5, -5], [22.5, 35]);

    engine.showProbe({
      config: {
        scanPattern: 'zigzag',
        scanDirection: undefined,
        stepX: undefined,
        stepY: undefined,
        interactable: true,
      },
    });
    expect(visualization.config).toMatchObject({
      scanPattern: 'zigzag', scanDirection: 'x', stepX: 10, stepY: 10,
    });
    expectLabels(visualization, [-2.5, -5], [2.5, 35]);

    engine.showProbe({ config: { scanPattern: 'spiral-in', interactable: true } });
    expectLabels(visualization, [-2.5, -5], [12.5, 25]);

    engine.showProbe({
      config: {
        startX: -10,
        startY: -20,
        endX: 15,
        endY: -5,
        stepX: 10,
        stepY: 10,
        scanDirection: 'y',
        interactable: true,
      },
    });
    expectLabels(visualization, [-12.5, -25], [2.5, -15]);

    engine.showProbe({ config: { scanDirection: 'x', scanPattern: undefined, interactable: true } });
    expect(visualization.config.scanPattern).toBe('spiral-in');
    expectLabels(visualization, [-12.5, -25], [-7.5, -5]);

    engine.showProbe({ config: { stepY: 5, interactable: true } });
    expectLabels(visualization, [-12.5, -25], [2.5, -5]);
    engine.showProbe({ config: { stepX: 5, interactable: true } });
    expectLabels(visualization, [-12.5, -25], [-2.5, -5]);
    expect(engine.probeVisualization).toBe(visualization);
  });

  test('hides invalid paths through interaction changes and restores them after correction', () => {
    const config = { ...grid, scanPattern: 'zigzag', scanDirection: 'x' };
    engine.showProbe({ config });
    const visualization = engine.probeVisualization;
    const startLabel = visualization.pathStartLabel;
    const endLabel = visualization.pathEndLabel;
    const invalidInputs = [
      { startX: '' },
      { startY: '  ' },
      { endX: NaN },
      { endY: Infinity },
      { stepX: '' },
      { stepY: 0 },
      { stepX: -1 },
      { endX: -1 },
      { endY: -1 },
      { scanPattern: 'invalid' },
      { scanDirection: 'invalid' },
    ];

    invalidInputs.forEach(invalid => {
      engine.showProbe({ config: { ...config, ...invalid } });
      expect(visualization.getPathEndpoints()).toEqual({ start: null, end: null });
      expect(startLabel.visible).toBe(false);
      expect(endLabel.visible).toBe(false);
      visualization.setInteractable(false);
      visualization.setInteractable(true);
      expect(startLabel.visible).toBe(false);
      expect(endLabel.visible).toBe(false);

      engine.showProbe({ config });
      expect(visualization.pathStartLabel).toBe(startLabel);
      expect(visualization.pathEndLabel).toBe(endLabel);
      expectLabels(visualization, [-2.5, -5], [2.5, 35]);
    });

    engine.showProbe({ config: { ...config, interactable: false } });
    expectLabels(visualization, [-2.5, -5], [2.5, 35], false);
    visualization.setInteractable(true);
    expectLabels(visualization, [-2.5, -5], [2.5, 35]);
  });

  test('preserves labels when probe data changes and releases owned listeners and resources', () => {
    engine.showProbe({ config: grid });
    const visualization = engine.probeVisualization;
    engine.showProbe({
      config: { ...grid, scanPattern: 'spiral-in' },
      probeData: [{ x: 0, y: 0, z: -0.25 }],
    });
    expectLabels(visualization, [-2.5, -5], [12.5, 25]);
    expect(visualization.group.children).toEqual(expect.arrayContaining([
      visualization.pathStartLabel,
      visualization.pathEndLabel,
    ]));
    expect(visualization.metricsOwner).toBe(engine);
    expect(listenerDelta.mock.calls.filter(([owner, delta]) => owner === engine && delta === 3)).toHaveLength(2);

    const listeners = [
      ['mousemove', visualization.onMouseMoveBound],
      ['mousedown', visualization.onMouseDownBound],
      ['mouseup', visualization.onMouseUpBound],
    ];
    listeners.forEach(([event, handler]) => {
      expect(addEventListener).toHaveBeenCalledWith(event, handler, true);
    });
    const material = visualization.pathStartLabel.children[0].material;
    const disposeTexture = jest.spyOn(material.map, 'dispose');
    const disposeMaterial = jest.spyOn(material, 'dispose');
    const disposeGeometry = jest.spyOn(visualization.boundaryLine.geometry, 'dispose');
    const controls = engine.controls;

    engine.dispose();

    listeners.forEach(([event, handler]) => {
      expect(removeEventListener).toHaveBeenCalledWith(event, handler, true);
    });
    expect(controls.removeEventListener).toHaveBeenCalledTimes(3);
    expect(listenerDelta.mock.calls.filter(([owner, delta]) => owner === engine && delta === -3)).toHaveLength(2);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(mockRenderer.dispose).toHaveBeenCalled();
  });
});
