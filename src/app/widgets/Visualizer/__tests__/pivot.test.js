import * as THREE from 'three';
import { createVisualizerEngine } from '../VisualizerEngine';
import {
  rectangularFixture,
} from './fixtures';

const mockRenderer = {
  clear: jest.fn(),
  domElement: document.createElement('canvas'),
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
    handleResize: jest.fn(),
    noPan: false,
    noZoom: false,
    object: { position: new mockThree.Vector3(), up: new mockThree.Vector3() },
    panSpeed: 1,
    reset: jest.fn(),
    setMouseButtonState: jest.fn(),
    target: new mockThree.Vector3(),
    update: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
  }));
});

jest.mock('../helpers', () => {
  const actual = jest.requireActual('../helpers');
  return {
    ...actual,
    loadSTL: jest.fn(() => new Promise(() => {})),
    loadTexture: jest.fn(() => new Promise(() => {})),
  };
});

const PROFILE_A = {
  id: 'profile-a',
  limits: {
    xmin: 0,
    xmax: 200,
    ymin: -100,
    ymax: 100,
    zmin: -10,
    zmax: 10,
  },
};

const PROFILE_B = {
  id: 'profile-b',
  limits: {
    xmin: -100,
    xmax: 0,
    ymin: 50,
    ymax: 100,
    zmin: -10,
    zmax: 10,
  },
};

const createState = () => ({
  cameraMode: 'rotate',
  gcode: { sent: 0 },
  isAgitated: false,
  machinePosition: { x: 0, y: 0, z: 0 },
  objects: {
    coordinateSystem: { visible: false },
    cuttingTool: { visible: false },
    gridLineNumbers: { visible: false },
    limits: { visible: true },
  },
  projection: 'perspective',
  units: 'metric',
  workPosition: { x: 0, y: 0, z: 0 },
});

const createHarness = () => {
  const renderedScenes = [];
  mockRenderer.render.mockImplementation(scene => {
    renderedScenes.push(scene);
  });
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 640 });
  Object.defineProperty(container, 'clientHeight', { value: 480 });
  const engine = createVisualizerEngine({
    container,
    onError: jest.fn(),
    viewState: {
      ...createState(),
      machineProfile: null,
      show: true,
    },
  });
  return { engine, renderedScenes };
};

const expectPivot = (engine, expected) => {
  const actual = engine.pivotPoint.get();

  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.z).toBeCloseTo(expected.z, 6);
};

const expectWorldCenter = (scene, expected) => {
  const object = scene.getObjectByName('Visualizer');
  expect(object).toBeDefined();

  scene.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());

  expect(center.x).toBeCloseTo(expected.x, 6);
  expect(center.y).toBeCloseTo(expected.y, 6);
  expect(center.z).toBeCloseTo(expected.z, 6);
};

describe('Visualizer pivot geometry baseline', () => {
  let harness;

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
    mockRenderer.render.mockClear();
    harness = createHarness();
  });

  afterEach(() => {
    harness.engine.dispose();
  });

  test('machine profile and G-code transitions preserve the pivot contract', () => {
    const { engine, renderedScenes } = harness;

    const changeProfile = (profile) => {
      engine.update({ machineProfile: profile });
    };

    changeProfile(PROFILE_A);
    expectPivot(engine, { x: 100, y: 0, z: 0 });
    expect(engine.scene.getObjectByName('Visualizer')).toBeUndefined();

    engine.load({ name: 'rectangle.gcode', content: rectangularFixture });
    expectPivot(engine, { x: 30, y: 40, z: -1 });
    expectWorldCenter(renderedScenes[renderedScenes.length - 1], { x: 0, y: 0, z: 0 });

    changeProfile(PROFILE_A);
    expectPivot(engine, { x: 30, y: 40, z: -1 });
    changeProfile(null);
    expectPivot(engine, { x: 30, y: 40, z: -1 });
    expectWorldCenter(renderedScenes[renderedScenes.length - 1], { x: 0, y: 0, z: 0 });

    changeProfile(PROFILE_B);
    expectPivot(engine, { x: 30, y: 40, z: -1 });
    expectWorldCenter(renderedScenes[renderedScenes.length - 1], { x: 0, y: 0, z: 0 });

    engine.unload();
    expectPivot(engine, { x: -50, y: 75, z: 0 });
    expect(engine.scene.getObjectByName('Visualizer')).toBeUndefined();

    changeProfile(null);
    expectPivot(engine, { x: 0, y: 0, z: 0 });
    expect(engine.scene.getObjectByName('Visualizer')).toBeUndefined();

    engine.load({ name: 'rectangle.gcode', content: rectangularFixture });
    expectPivot(engine, { x: 30, y: 40, z: -1 });
    expectWorldCenter(renderedScenes[renderedScenes.length - 1], { x: 0, y: 0, z: 0 });
  });

  test('same-content and different-content reloads replace one centered object', () => {
    const { renderedScenes, engine } = harness;
    const shorterFixture = [
      'G21', 'G90',
      'G0 X0 Y0 Z0',
      'G1 X5 Y5 Z0',
    ].join('\n');

    engine.update({ machineProfile: PROFILE_A });

    engine.load({ name: 'first.gcode', content: rectangularFixture });
    const firstObject = engine.scene.getObjectByName('Visualizer');

    const secondResult = engine.load({ name: 'same.gcode', content: rectangularFixture });
    const secondModel = engine.gcodeVisualizer;
    const secondObject = engine.scene.getObjectByName('Visualizer');

    expect(secondObject).toBeDefined();
    expect(secondObject).not.toBe(firstObject);
    expect(secondObject.parent).toBe(engine.group);
    expect(engine.group.children.filter(child => child.name === 'Visualizer')).toHaveLength(1);
    expect(secondResult.bbox).toEqual({
      min: { x: 10, y: 20, z: -2 },
      max: { x: 50, y: 60, z: 0 },
    });
    expect(secondModel.geometry.vertices).toHaveLength(5);
    expectWorldCenter(renderedScenes[renderedScenes.length - 1], { x: 0, y: 0, z: 0 });

    const thirdResult = engine.load({ name: 'different.gcode', content: shorterFixture });
    const thirdModel = engine.gcodeVisualizer;
    const thirdObject = engine.scene.getObjectByName('Visualizer');

    expect(thirdObject).toBeDefined();
    expect(thirdObject).not.toBe(secondObject);
    expect(engine.group.children.filter(child => child.name === 'Visualizer')).toHaveLength(1);
    expect(thirdResult.bbox).toEqual({
      min: { x: 0, y: 0, z: 0 },
      max: { x: 5, y: 5, z: 0 },
    });
    expect(thirdModel.geometry.vertices).toHaveLength(2);
    expectWorldCenter(renderedScenes[renderedScenes.length - 1], { x: 0, y: 0, z: 0 });
  });
});
