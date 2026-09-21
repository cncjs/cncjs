import { composeScene, toolPoint } from '../compose';

const ALL = { path: true, programArea: true, wcsAxes: true, machineArea: true, machineAxes: true };
const NONE = { path: false, programArea: false, wcsAxes: false, machineArea: false, machineAxes: false };

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

// Work zero at machine (-100, -80, -10): the offset the caller settles from
// the two positions in every status report.
const OFFSET = { x: -100, y: -80, z: -10 };

const scene = (overrides = {}) => composeScene({
  settings: SETTINGS,
  wcs: 'G54',
  offset: OFFSET,
  toolpath: TOOLPATH,
  layers: ALL,
  ...overrides,
});

describe('where the program is drawn', () => {
  test('is moved by the work offset, not drawn where its numbers say', () => {
    // Work zero at machine (-100, -80, -10), so a program that starts at its
    // own origin is cut there. Drawing it at machine zero instead would put
    // it 100mm away and look entirely reasonable.
    const drawn = scene();

    expect(drawn.offset).toEqual({ x: -100, y: -80, z: -10 });
    expect(drawn.program).toEqual({
      min: { x: -100, y: -80, z: -12 },
      max: { x: -90, y: -70, z: -10 },
    });
  });

  test('moving the work zero moves it', () => {
    // The machine has not moved; the zero has. Work X went from 0 to 25 at the
    // same machine position, so the program is drawn 25mm further negative.
    const moved = scene({ offset: { ...OFFSET, x: -125 } });

    expect(moved.program.min.x).toBe(-125);
  });

  test('draws about machine zero when there is no offset to apply', () => {
    // What the caller hands in when the machine has not reported both
    // positions. Wrong, and wrong in the one place the screen also says it
    // does not know where machine zero is.
    const drawn = scene({ offset: { x: 0, y: 0, z: 0 } });

    expect(drawn.program.min).toEqual(TOOLPATH.bounds.min);
  });
});

describe('what the camera is framed on', () => {
  test('is the union of the layers that are switched on', () => {
    const drawn = scene();

    // The envelope reaches -200 and the program reaches -70. Framing the
    // program alone is what left the envelope crossing the view as two
    // unexplained lines.
    expect(drawn.frame).toEqual({
      min: { x: -200, y: -200, z: -200 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('is the program alone once the machine is switched off', () => {
    const drawn = scene({ layers: { ...ALL, machineArea: false, machineAxes: false, wcsAxes: false } });

    expect(drawn.frame).toEqual({
      min: { x: -100, y: -80, z: -12 },
      max: { x: -90, y: -70, z: -10 },
    });
  });

  test('includes a work origin outside everything else', () => {
    const drawn = scene({ toolpath: null, layers: { ...NONE, wcsAxes: true } });

    // G55 sits at (-40, -60, -5) and G54 at the origin; both have to be on
    // screen or the layer is a chip that appears to do nothing.
    expect(drawn.frame).toEqual({
      min: { x: -40, y: -60, z: -5 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('is something rather than nothing with every layer off', () => {
    const drawn = scene({ layers: NONE });

    expect(drawn.frame).toEqual({
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    });
  });

  test('gives markers a size to scale against even for a flat program', () => {
    const flat = {
      ...TOOLPATH,
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0.2, y: 0.2, z: 0 } },
    };
    const drawn = scene({ toolpath: flat, layers: { ...NONE, path: true } });

    // Without a floor the tool marker and the origin crosses would be sized
    // at a fraction of 0.2mm and simply not be there.
    expect(drawn.size).toBe(1);
  });
});

describe('the work coordinate systems', () => {
  test('marks the one the machine is working in', () => {
    const drawn = scene({ toolpath: null });

    expect(drawn.origins).toEqual([
      { name: 'G54', origin: { x: 0, y: 0, z: 0 }, active: true },
      { name: 'G55', origin: { x: -40, y: -60, z: -5 }, active: false },
    ]);
  });

  test('marks none of them when the parser state has not arrived', () => {
    const drawn = scene({ wcs: undefined, toolpath: null });

    expect(drawn.origins.every((system) => !system.active)).toBe(true);
  });
});

describe('the tool', () => {
  test('is the machine position, which is the frame everything else is in', () => {
    expect(toolPoint({ x: -100, y: -80, z: -10 })).toEqual({ x: -100, y: -80, z: -10 });
  });

  test('is nothing until the machine has reported one', () => {
    expect(toolPoint({ x: null, y: null, z: null })).toBeNull();
    expect(toolPoint(undefined)).toBeNull();
  });

  test('is taken live rather than composed, so the picture can stay settled', () => {
    // The whole reason it is a separate function. Everything `composeScene`
    // returns is memoised by the caller; this is the one reading that moves
    // four times a second, and a scene recomposed around it was rebuilding
    // every outline's geometry at the same rate.
    expect(scene()).not.toHaveProperty('tool');
  });
});
