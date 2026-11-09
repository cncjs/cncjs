import * as THREE from 'three';
import { createVisualizerEngine } from '../VisualizerEngine';
import * as helpers from '../helpers';
import { loadSTL, loadTexture } from '../helpers';

const mockRendererInstances = [];
const mockControlsInstances = [];
const mockSTLLoaderLoad = jest.fn();
const mockTextureLoaderLoad = jest.fn();

jest.mock('three', () => {
  const actual = jest.requireActual('three');
  return {
    ...actual,
    TextureLoader: jest.fn(() => ({
      load: mockTextureLoaderLoad,
    })),
    WebGLRenderer: jest.fn(() => {
      const renderer = {
        clear: jest.fn(),
        domElement: global.document.createElement('canvas'),
        render: jest.fn(),
        setClearColor: jest.fn(),
        setPixelRatio: jest.fn(),
        setSize: jest.fn(),
        shadowMap: {},
        dispose: jest.fn(),
      };
      mockRendererInstances.push(renderer);
      return renderer;
    }),
  };
});

jest.mock('@app/lib/three/STLLoader', () => jest.fn(() => ({
  load: mockSTLLoaderLoad,
})));

jest.mock('@app/lib/three/TrackballControls', () => jest.fn().mockImplementation(() => {
  const mockThree = jest.requireActual('three');
  const listeners = new Map();
  const controls = {
    addEventListener: jest.fn((name, callback) => {
      listeners.set(name, callback);
    }),
    dispose: jest.fn(),
    handleResize: jest.fn(),
    noPan: false,
    noZoom: false,
    object: {
      position: new mockThree.Vector3(),
      up: new mockThree.Vector3(),
    },
    panSpeed: 1,
    reset: jest.fn(),
    removeEventListener: jest.fn((name, callback) => {
      if (listeners.get(name) === callback) {
        listeners.delete(name);
      }
    }),
    setMouseButtonState: jest.fn(),
    target: new mockThree.Vector3(),
    trigger: name => {
      const callback = listeners.get(name);
      if (callback) {
        callback();
      }
    },
    update: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
  };
  mockControlsInstances.push(controls);
  return controls;
}));

const viewState = {
  cameraMode: 'rotate',
  cameraPosition: '3d',
  isAgitated: false,
  machinePosition: { x: 0, y: 0, z: 0 },
  machineProfile: null,
  objects: {
    coordinateSystem: { visible: false },
    cuttingTool: { visible: false },
    gridLineNumbers: { visible: false },
    limits: { visible: true },
  },
  projection: 'perspective',
  sent: 0,
  show: true,
  units: 'metric',
  workPosition: { x: 0, y: 0, z: 0 },
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushAsync = () => new Promise(resolve => {
  setTimeout(resolve, 0);
});

const makeGeometry = () => {
  const geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 10),
    new THREE.Vector3(1, 0, 0),
  );
  geometry.hasColors = true;
  geometry.alpha = 1;
  return geometry;
};

const makeTexture = () => new THREE.Texture();

const makeContainer = () => {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 640 });
  Object.defineProperty(container, 'clientHeight', { value: 480 });
  return container;
};

const makeEngine = (options = {}) => createVisualizerEngine({
  container: makeContainer(),
  onError: jest.fn(),
  viewState,
  ...options,
});

describe('Visualizer resource ownership', () => {
  let loadSTLSpy;
  let loadTextureSpy;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;
  let rafCallbacks;
  let nextRafId;

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
    mockRendererInstances.length = 0;
    mockControlsInstances.length = 0;
    mockSTLLoaderLoad.mockReset();
    mockTextureLoaderLoad.mockReset();

    loadSTLSpy = jest.spyOn(helpers, 'loadSTL');
    loadTextureSpy = jest.spyOn(helpers, 'loadTexture');

    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalCancelAnimationFrame = global.cancelAnimationFrame;
    rafCallbacks = new Map();
    nextRafId = 1;
    global.requestAnimationFrame = jest.fn(callback => {
      const id = nextRafId;
      nextRafId += 1;
      rafCallbacks.set(id, callback);
      return id;
    });
    global.cancelAnimationFrame = jest.fn(id => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    loadSTLSpy.mockRestore();
    loadTextureSpy.mockRestore();
    if (originalRequestAnimationFrame === undefined) {
      delete global.requestAnimationFrame;
    } else {
      global.requestAnimationFrame = originalRequestAnimationFrame;
    }
    if (originalCancelAnimationFrame === undefined) {
      delete global.cancelAnimationFrame;
    } else {
      global.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  const runRafFrame = id => {
    const callback = rafCallbacks.get(id);
    rafCallbacks.delete(id);
    callback();
  };

  test('loadSTL rejects when the loader reports an error', async () => {
    const error = new Error('stl failed');
    mockSTLLoaderLoad.mockImplementation((url, onLoad, onProgress, onError) => {
      (onError || onLoad)(error);
    });

    await expect(loadSTL('model.stl')).rejects.toBe(error);
  });

  test('loadTexture rejects when the loader reports an error', async () => {
    const error = new Error('texture failed');
    mockTextureLoaderLoad.mockImplementation((url, onLoad, onProgress, onError) => {
      (onError || onLoad)(error);
    });

    await expect(loadTexture('texture.jpg')).rejects.toBe(error);
  });

  test('disposes a successful geometry when the texture load rejects', async () => {
    const geometry = makeGeometry();
    const geometryDispose = jest.spyOn(geometry, 'dispose');
    const stl = deferred();
    const texture = deferred();
    const onError = jest.fn();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(texture.promise);

    const engine = makeEngine({ onError });
    const renderCount = mockRendererInstances[0].render.mock.calls.length;
    const error = new Error('texture failed');
    stl.resolve(geometry);
    texture.reject(error);
    await flushAsync();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(engine.group.getObjectByName('CuttingTool')).toBeUndefined();
    expect(mockRendererInstances[0].render).toHaveBeenCalledTimes(renderCount);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
    engine.dispose();
  });

  test('attaches successful deferred assets and disposes each resource once', async () => {
    const geometry = makeGeometry();
    const texture = makeTexture();
    const geometryDispose = jest.spyOn(geometry, 'dispose');
    const textureDispose = jest.spyOn(texture, 'dispose');
    const stl = deferred();
    const textureLoad = deferred();
    const onError = jest.fn();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(textureLoad.promise);

    const engine = makeEngine({
      onError,
      viewState: {
        ...viewState,
        objects: {
          ...viewState.objects,
          cuttingTool: { visible: true },
        },
      },
    });
    stl.resolve(geometry);
    textureLoad.resolve(texture);
    await flushAsync();

    const cuttingTool = engine.group.getObjectByName('CuttingTool');
    expect(cuttingTool).toBeDefined();
    expect(cuttingTool.children[0].geometry).toBe(geometry);
    expect(cuttingTool.children[0].material.map).toBe(texture);
    expect(onError).not.toHaveBeenCalled();

    engine.dispose();
    engine.dispose();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });

  test('disposes a successful texture when the STL load rejects', async () => {
    const texture = makeTexture();
    const textureDispose = jest.spyOn(texture, 'dispose');
    const stl = deferred();
    const textureLoad = deferred();
    const onError = jest.fn();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(textureLoad.promise);

    const engine = makeEngine({ onError });
    const error = new Error('stl failed');
    stl.reject(error);
    textureLoad.resolve(texture);
    await flushAsync();

    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(engine.group.getObjectByName('CuttingTool')).toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
    engine.dispose();
  });

  test('disposes late assets after disposal without attaching, rendering, or reporting an error', async () => {
    const geometry = makeGeometry();
    const texture = makeTexture();
    const geometryDispose = jest.spyOn(geometry, 'dispose');
    const textureDispose = jest.spyOn(texture, 'dispose');
    const stl = deferred();
    const textureLoad = deferred();
    const onError = jest.fn();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(textureLoad.promise);

    const engine = makeEngine({ onError });
    stl.resolve(geometry);
    await flushAsync();
    const renderCount = mockRendererInstances[0].render.mock.calls.length;
    engine.dispose();

    textureLoad.resolve(texture);
    await flushAsync();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(engine.group.getObjectByName('CuttingTool')).toBeUndefined();
    expect(mockRendererInstances[0].render).toHaveBeenCalledTimes(renderCount);
    expect(onError).not.toHaveBeenCalled();
  });

  test('disposes stale-generation assets without attaching or reporting an error', async () => {
    const staleGeometry = makeGeometry();
    const staleTexture = makeTexture();
    const currentGeometry = makeGeometry();
    const currentTexture = makeTexture();
    const staleGeometryDispose = jest.spyOn(staleGeometry, 'dispose');
    const staleTextureDispose = jest.spyOn(staleTexture, 'dispose');
    const staleSTL = deferred();
    const staleTextureLoad = deferred();
    const currentSTL = deferred();
    const currentTextureLoad = deferred();
    const onError = jest.fn();
    loadSTLSpy
      .mockReturnValueOnce(staleSTL.promise)
      .mockReturnValueOnce(currentSTL.promise);
    loadTextureSpy
      .mockReturnValueOnce(staleTextureLoad.promise)
      .mockReturnValueOnce(currentTextureLoad.promise);

    const engine = makeEngine({ onError });
    engine.loadCuttingTool();

    staleSTL.resolve(staleGeometry);
    staleTextureLoad.resolve(staleTexture);
    await flushAsync();

    expect(staleGeometryDispose).toHaveBeenCalledTimes(1);
    expect(staleTextureDispose).toHaveBeenCalledTimes(1);
    expect(engine.group.getObjectByName('CuttingTool')).toBeUndefined();
    expect(onError).not.toHaveBeenCalled();

    currentSTL.resolve(currentGeometry);
    currentTextureLoad.resolve(currentTexture);
    await flushAsync();

    const cuttingTool = engine.group.getObjectByName('CuttingTool');
    expect(cuttingTool).toBeDefined();
    expect(cuttingTool.children[0].geometry).toBe(currentGeometry);
    expect(mockRendererInstances).toHaveLength(1);
    engine.dispose();
  });

  test('attaches late assets using the current view state without recreating the renderer', async () => {
    const geometry = makeGeometry();
    const texture = makeTexture();
    const stl = deferred();
    const textureLoad = deferred();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(textureLoad.promise);

    const engine = makeEngine();
    engine.update({
      machineProfile: {
        limits: { xmin: 0, xmax: 100, ymin: 0, ymax: 100, zmin: -10, zmax: 10 },
      },
      objects: { cuttingTool: { visible: true } },
      workPosition: { x: 70, y: 80, z: 10 },
    });
    const latestProfile = {
      limits: { xmin: 100, xmax: 300, ymin: 200, ymax: 400, zmin: -20, zmax: 20 },
    };
    engine.update({
      machineProfile: latestProfile,
      objects: { cuttingTool: { visible: true } },
      workPosition: { x: 250, y: 350, z: 10 },
    });

    stl.resolve(geometry);
    textureLoad.resolve(texture);
    await flushAsync();

    const cuttingTool = engine.group.getObjectByName('CuttingTool');
    expect(cuttingTool).not.toBeNull();
    expect(cuttingTool.visible).toBe(true);
    expect(cuttingTool.position).toMatchObject({ x: 50, y: 50, z: 10 });
    expect(engine.machineProfile).toEqual(latestProfile);
    expect(mockRendererInstances).toHaveLength(1);
    engine.dispose();
  });

  test('attaches successful assets after a G-code unload and disposes them once', async () => {
    const geometry = makeGeometry();
    const texture = makeTexture();
    const geometryDispose = jest.spyOn(geometry, 'dispose');
    const textureDispose = jest.spyOn(texture, 'dispose');
    const stl = deferred();
    const textureLoad = deferred();
    const onError = jest.fn();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(textureLoad.promise);

    const engine = makeEngine({ onError });
    engine.unload();
    stl.resolve(geometry);
    textureLoad.resolve(texture);
    await flushAsync();

    expect(engine.group.getObjectByName('CuttingTool')).toBeDefined();
    expect(onError).not.toHaveBeenCalled();

    engine.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });

  test('unload disposes G-code geometry and material resources', () => {
    const stl = deferred();
    const texture = deferred();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(texture.promise);

    const engine = makeEngine();
    engine.load({ content: 'G1 X1 Y1' });
    const visualizer = engine.group.getObjectByName('Visualizer');
    const workpiece = visualizer.children[0];
    const workpieceGeometryDispose = jest.spyOn(workpiece.geometry, 'dispose');
    const workpieceMaterialDispose = jest.spyOn(workpiece.material, 'dispose');
    const pathGeometryDispose = jest.spyOn(engine.gcodeVisualizer.geometry, 'dispose');

    engine.unload();

    expect(workpieceGeometryDispose).toHaveBeenCalledTimes(1);
    expect(workpieceMaterialDispose).toHaveBeenCalledTimes(1);
    expect(pathGeometryDispose).toHaveBeenCalledTimes(1);
    expect(engine.group.getObjectByName('Visualizer')).toBeUndefined();
    engine.dispose();
  });

  test('dispose releases probe resources once without traversing the probe subtree twice', () => {
    const stl = deferred();
    const texture = deferred();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(texture.promise);
    const engine = makeEngine();
    const labelTextures = [];
    engine.probeVisualization.group.traverse(object => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (material && material.map) {
          labelTextures.push(material.map);
        }
      });
    });
    const labelTextureSpies = [...new Set(labelTextures)]
      .map(textureValue => jest.spyOn(textureValue, 'dispose'));
    const ownedGeometry = new THREE.Geometry();
    const ownedMaterial = new THREE.MeshBasicMaterial();
    const ownedMesh = new THREE.Mesh(ownedGeometry, ownedMaterial);
    engine.probeVisualization.group.add(ownedMesh);
    const geometryDispose = jest.spyOn(ownedGeometry, 'dispose');
    const materialDispose = jest.spyOn(ownedMaterial, 'dispose');

    engine.dispose();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    labelTextureSpies.forEach(textureDispose => {
      expect(textureDispose).toHaveBeenCalledTimes(1);
    });
  });

  test('does not dispose shared Sprite geometry during coordinate rebuild or engine disposal', () => {
    const pending = new Promise(() => {});
    loadSTLSpy.mockReturnValue(pending);
    loadTextureSpy.mockReturnValue(pending);
    const firstEngine = makeEngine();
    const secondEngine = makeEngine();
    const firstCoordinateSystem = firstEngine.group.getObjectByName('MetricCoordinateSystem');
    const secondCoordinateSystem = secondEngine.group.getObjectByName('MetricCoordinateSystem');
    const firstSprite = firstCoordinateSystem.getObjectByProperty('isSprite', true);
    const secondSprite = secondCoordinateSystem.getObjectByProperty('isSprite', true);
    expect(firstSprite).toBeDefined();
    expect(secondSprite).toBeDefined();
    expect(firstSprite.geometry).toBe(secondSprite.geometry);
    const sharedGeometryDispose = jest.spyOn(firstSprite.geometry, 'dispose');

    try {
      firstEngine.update({ units: 'imperial' });
      expect(sharedGeometryDispose).not.toHaveBeenCalled();
      expect(secondSprite.geometry).toBe(firstSprite.geometry);
      firstEngine.dispose();
      secondEngine.dispose();
      expect(sharedGeometryDispose).not.toHaveBeenCalled();
    } finally {
      sharedGeometryDispose.mockRestore();
    }
  });

  test('releases the strong resource ownership index after disposal', () => {
    const stl = deferred();
    const texture = deferred();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(texture.promise);
    const engine = makeEngine();
    engine.load({ content: 'G1 X1 Y1' });

    engine.dispose();

    expect(engine.ownedResources).toBeUndefined();
    expect(engine.disposedResources).toBeInstanceOf(WeakSet);
    expect(engine.pendingAssetLoads.size).toBe(0);
  });

  test('advances each RAF loop one frame without creating duplicate loops', () => {
    const stl = deferred();
    const texture = deferred();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(texture.promise);

    const engine = makeEngine();
    const renderer = mockRendererInstances[0];
    const controls = mockControlsInstances[0];
    engine.update({ isAgitated: true });
    controls.trigger('start');
    controls.trigger('start');
    engine.startAgitation();

    expect(rafCallbacks).toHaveProperty('size', 2);
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(2);
    const renderCount = renderer.render.mock.calls.length;
    const agitationFrame = engine.agitationAnimationFrame;
    const controlsFrame = engine.controlsAnimationFrame;

    runRafFrame(agitationFrame);
    expect(renderer.render).toHaveBeenCalledTimes(renderCount + 1);
    expect(engine.agitationAnimationFrame).not.toBe(agitationFrame);
    expect(rafCallbacks).toHaveProperty('size', 2);

    runRafFrame(controlsFrame);
    expect(renderer.render).toHaveBeenCalledTimes(renderCount + 2);
    expect(engine.controlsAnimationFrame).not.toBe(controlsFrame);
    expect(rafCallbacks).toHaveProperty('size', 2);

    engine.dispose();
  });

  test('ignores canceled RAF callbacks after either loop is restarted', () => {
    const stl = deferred();
    const texture = deferred();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(texture.promise);

    const engine = makeEngine();
    const renderer = mockRendererInstances[0];
    const controls = mockControlsInstances[0];

    engine.update({ isAgitated: true });
    const staleAgitationFrame = engine.agitationAnimationFrame;
    const staleAgitationCallback = rafCallbacks.get(staleAgitationFrame);
    engine.update({ isAgitated: false });
    engine.update({ isAgitated: true });
    const currentAgitationFrame = engine.agitationAnimationFrame;
    const renderCountAfterAgitationRestart = renderer.render.mock.calls.length;

    staleAgitationCallback();

    expect(engine.agitationAnimationFrame).toBe(currentAgitationFrame);
    expect(renderer.render).toHaveBeenCalledTimes(renderCountAfterAgitationRestart);
    expect(rafCallbacks).toHaveProperty('size', 1);

    controls.trigger('start');
    const staleControlsFrame = engine.controlsAnimationFrame;
    const staleControlsCallback = rafCallbacks.get(staleControlsFrame);
    controls.trigger('end');
    controls.trigger('start');
    const currentControlsFrame = engine.controlsAnimationFrame;
    const renderCountAfterControlsRestart = renderer.render.mock.calls.length;

    staleControlsCallback();

    expect(engine.controlsAnimationFrame).toBe(currentControlsFrame);
    expect(renderer.render).toHaveBeenCalledTimes(renderCountAfterControlsRestart);
    expect(rafCallbacks).toHaveProperty('size', 2);

    engine.dispose();
  });

  test('dispose is idempotent, cancels both RAF loops, removes named listeners, and keeps the host', () => {
    const stl = deferred();
    const texture = deferred();
    loadSTLSpy.mockReturnValue(stl.promise);
    loadTextureSpy.mockReturnValue(texture.promise);
    const container = makeContainer();
    const hostCanvas = document.createElement('canvas');
    container.appendChild(hostCanvas);
    const onError = jest.fn();
    const engine = createVisualizerEngine({ container, onError, viewState: { ...viewState } });
    const renderer = mockRendererInstances[0];
    const controls = mockControlsInstances[0];

    engine.update({ isAgitated: true });
    controls.trigger('start');
    controls.trigger('start');
    const scheduled = [...rafCallbacks.entries()];
    expect(scheduled).toHaveLength(2);
    const renderCount = renderer.render.mock.calls.length;

    engine.dispose();
    engine.dispose();

    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(controls.dispose).toHaveBeenCalledTimes(1);
    expect(controls.removeEventListener).toHaveBeenCalledTimes(3);
    expect(global.cancelAnimationFrame).toHaveBeenCalledTimes(2);
    expect(container.contains(hostCanvas)).toBe(true);
    expect(container.contains(renderer.domElement)).toBe(false);
    expect(renderer.render).toHaveBeenCalledTimes(renderCount);

    scheduled.forEach(([, callback]) => callback());
    controls.trigger('change');
    controls.trigger('start');
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(renderer.render).toHaveBeenCalledTimes(renderCount);
    expect(onError).not.toHaveBeenCalled();
  });
});
