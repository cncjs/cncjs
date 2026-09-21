import { composeScene } from '../compose';

const ALL = { path: true, machine: true, work: true, program: true };
const NONE = { path: false, machine: false, work: false, program: false };

// COM3: 200mm on each axis, homing off, nothing inverted.
const SETTINGS = {
  settings: { $20: '0', $22: '0', $23: '0', $130: '200', $131: '200', $132: '200' },
  parameters: {
    G54: { x: '0.000', y: '0.000', z: '0.000' },
    G55: { x: '-40.000', y: '-60.000', z: '-5.000' },
  },
};

// A 10mm square cut 2mm deep, written against the work zero.
const TOOLPATH = {
  name: 'part.nc',
  bounds: { min: { x: 0, y: 0, z: -2 }, max: { x: 10, y: 10, z: 0 } },
  cut: { positions: new Float32Array(0), colors: new Float32Array(0), vertexIndex: new Uint32Array(0) },
  rapid: { positions: new Float32Array(0), colors: new Float32Array(0), vertexIndex: new Uint32Array(0) },
};

const machine = (overrides = {}) => ({
  settings: SETTINGS,
  modal: { wcs: 'G54' },
  machinePosition: { x: -100, y: -80, z: -10 },
  position: { x: 0, y: 0, z: 0 },
  ...overrides,
});

describe('where the program is drawn', () => {
  test('is moved by the work offset, not drawn where its numbers say', () => {
    // Work zero at machine (-100, -80, -10), so a program that starts at its
    // own origin is cut there. Drawing it at machine zero instead would put
    // it 100mm away and look entirely reasonable.
    const scene = composeScene({ machine: machine(), toolpath: TOOLPATH, layers: ALL });

    expect(scene.offset).toEqual({ x: -100, y: -80, z: -10 });
    expect(scene.program).toEqual({
      min: { x: -100, y: -80, z: -12 },
      max: { x: -90, y: -70, z: -10 },
    });
  });

  test('moving the work zero moves it', () => {
    const moved = composeScene({
      machine: machine({ position: { x: 25, y: 0, z: 0 } }),
      toolpath: TOOLPATH,
      layers: ALL,
    });

    // The machine has not moved; the zero has. Work X went from 0 to 25 at the
    // same machine position, so the program is drawn 25mm further negative.
    expect(moved.offset.x).toBe(-125);
    expect(moved.program.min.x).toBe(-125);
  });

  test('falls back to machine zero when only one position has arrived', () => {
    const scene = composeScene({
      machine: machine({ position: { x: null, y: null, z: null } }),
      toolpath: TOOLPATH,
      layers: ALL,
    });

    expect(scene.offset).toEqual({ x: 0, y: 0, z: 0 });
    expect(scene.program.min).toEqual(TOOLPATH.bounds.min);
  });
});

describe('what the camera is framed on', () => {
  test('is the union of the layers that are switched on', () => {
    const scene = composeScene({ machine: machine(), toolpath: TOOLPATH, layers: ALL });

    // The envelope reaches -200 and the program reaches -70. Framing the
    // program alone is what left the envelope crossing the view as two
    // unexplained lines.
    expect(scene.frame).toEqual({
      min: { x: -200, y: -200, z: -200 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('is the program alone once the machine is switched off', () => {
    const scene = composeScene({
      machine: machine(),
      toolpath: TOOLPATH,
      layers: { ...ALL, machine: false, work: false },
    });

    expect(scene.frame).toEqual({
      min: { x: -100, y: -80, z: -12 },
      max: { x: -90, y: -70, z: -10 },
    });
  });

  test('includes a work origin outside everything else', () => {
    const scene = composeScene({
      machine: machine(),
      toolpath: null,
      layers: { ...NONE, work: true },
    });

    // G55 sits at (-40, -60, -5) and G54 at the origin; both have to be on
    // screen or the layer is a chip that appears to do nothing.
    expect(scene.frame).toEqual({
      min: { x: -40, y: -60, z: -5 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('is something rather than nothing with every layer off', () => {
    const scene = composeScene({ machine: machine(), toolpath: TOOLPATH, layers: NONE });

    expect(scene.frame).toEqual({
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    });
  });

  test('gives markers a size to scale against even for a flat program', () => {
    const flat = {
      ...TOOLPATH,
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0.2, y: 0.2, z: 0 } },
    };
    const scene = composeScene({
      machine: machine(),
      toolpath: flat,
      layers: { ...NONE, path: true },
    });

    // Without a floor the tool marker and the origin crosses would be sized
    // at a fraction of 0.2mm and simply not be there.
    expect(scene.size).toBe(1);
  });
});

describe('the work coordinate systems', () => {
  test('marks the one the machine is working in', () => {
    const scene = composeScene({ machine: machine(), toolpath: null, layers: ALL });

    expect(scene.origins).toEqual([
      { name: 'G54', origin: { x: 0, y: 0, z: 0 }, active: true },
      { name: 'G55', origin: { x: -40, y: -60, z: -5 }, active: false },
    ]);
  });

  test('marks none of them when the parser state has not arrived', () => {
    const scene = composeScene({
      machine: machine({ modal: {} }),
      toolpath: null,
      layers: ALL,
    });

    expect(scene.origins.every((system) => !system.active)).toBe(true);
  });
});

describe('the tool', () => {
  test('is the machine position, which is the frame everything else is in', () => {
    const scene = composeScene({ machine: machine(), toolpath: null, layers: ALL });
    expect(scene.tool).toEqual({ x: -100, y: -80, z: -10 });
  });

  test('is nothing until the machine has reported one', () => {
    const scene = composeScene({
      machine: machine({ machinePosition: { x: null, y: null, z: null } }),
      toolpath: null,
      layers: ALL,
    });

    expect(scene.tool).toBeNull();
  });
});
