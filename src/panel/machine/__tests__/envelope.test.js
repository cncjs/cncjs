import {
  machineEnvelope,
  machineZeroIsGuess,
  softLimitsEnabled,
  workOffset,
  workOrigins,
} from '../envelope';

// What COM3 actually reports: 200mm of travel on each axis, homing off,
// no direction inverted. Measured 2026-09-21 against Grbl 1.1h.
const COM3 = {
  settings: {
    $20: '0',
    $22: '0',
    $23: '0',
    $130: '200.000',
    $131: '200.000',
    $132: '200.000',
  },
};

const withSettings = (overrides) => ({
  settings: { ...COM3.settings, ...overrides },
});

describe('machineEnvelope', () => {
  test('puts the volume below zero when homing runs to the positive end', () => {
    // The default, and the one that is drawn mirrored if `$23` is ignored:
    // Grbl homes to the maximum and calls that spot zero, so everything the
    // machine can reach is negative.
    expect(machineEnvelope(COM3)).toEqual({
      min: { x: -200, y: -200, z: -200 },
      max: { x: 0, y: 0, z: 0 },
    });
  });

  test('puts an inverted axis above zero, and only that axis', () => {
    // `$23=3` is X and Y inverted, Z not. A mask read as a boolean would move
    // all three, and the drawing would be right in plan and wrong in section.
    expect(machineEnvelope(withSettings({ $23: '3' }))).toEqual({
      min: { x: 0, y: 0, z: -200 },
      max: { x: 200, y: 200, z: 0 },
    });
  });

  test('reads the Z bit rather than the low bits', () => {
    expect(machineEnvelope(withSettings({ $23: '4' }))).toEqual({
      min: { x: -200, y: -200, z: 0 },
      max: { x: 0, y: 0, z: 200 },
    });
  });

  test('takes each axis travel from its own setting', () => {
    const envelope = machineEnvelope(withSettings({ $131: '300', $132: '80' }));
    expect(envelope.min).toEqual({ x: -200, y: -300, z: -80 });
  });

  test.each([
    ['an axis has not reported', { $131: undefined }],
    ['an axis reports nothing usable', { $131: '' }],
    ['an axis reports zero travel', { $131: '0' }],
    ['an axis reports negative travel', { $131: '-10' }],
  ])('is nothing when %s', (_name, overrides) => {
    // Three quarters of an envelope is not an envelope. Drawing one would put
    // a wall where the machine has none.
    expect(machineEnvelope(withSettings(overrides))).toBeNull();
  });

  test('is nothing when the controller has said nothing at all', () => {
    expect(machineEnvelope(undefined)).toBeNull();
    expect(machineEnvelope({})).toBeNull();
  });
});

describe('softLimitsEnabled', () => {
  test.each([
    ['0', false],
    ['1', true],
    [undefined, false],
  ])('$20=%s', (flag, expected) => {
    expect(softLimitsEnabled(withSettings({ $20: flag }))).toBe(expected);
  });
});

describe('machineZeroIsGuess', () => {
  test('is true with homing disabled, which is COM3', () => {
    expect(machineZeroIsGuess(COM3)).toBe(true);
  });

  test('is false once homing is enabled', () => {
    expect(machineZeroIsGuess(withSettings({ $22: '1' }))).toBe(false);
  });

  test('is false when the firmware has no such setting', () => {
    // Marlin and TinyG never report `$22`. Claiming their zero is a guess
    // would be inventing a reading, which is worse than not having one.
    expect(machineZeroIsGuess({ settings: {} })).toBe(false);
    expect(machineZeroIsGuess(undefined)).toBe(false);
  });
});

describe('workOrigins', () => {
  test('is empty when nothing has asked the machine for them', () => {
    // The state every client is in today: the server parses `[G54:…]` and
    // never causes one to be sent. See `workOffsets.js`.
    expect(workOrigins({ parameters: {} })).toEqual([]);
    expect(workOrigins(undefined)).toEqual([]);
  });

  test('reads the systems that answered, in order, as numbers', () => {
    const settings = {
      parameters: {
        G54: { x: '0.000', y: '0.000', z: '0.000' },
        G56: { x: '-10.500', y: '20.000', z: '-3.250' },
        // Not a work coordinate system. `$#` answers with these too, and a
        // screen that drew them would put outlines round the probe result.
        PRB: { x: '1.000', y: '2.000', z: '3.000', result: 1 },
        TLO: '0.000',
      },
    };

    expect(workOrigins(settings)).toEqual([
      { name: 'G54', origin: { x: 0, y: 0, z: 0 } },
      { name: 'G56', origin: { x: -10.5, y: 20, z: -3.25 } },
    ]);
  });

  test('drops a system that answered with an axis missing', () => {
    const settings = { parameters: { G55: { x: '0.000', y: '0.000' } } };
    expect(workOrigins(settings)).toEqual([]);
  });
});

describe('workOffset', () => {
  test('is the difference between the two positions in every report', () => {
    // Derived rather than read from `WCO:`, which Grbl sends only on change
    // and every tenth report otherwise.
    const offset = workOffset({ x: -100, y: -50, z: -10 }, { x: 0, y: 25, z: -10 });
    expect(offset).toEqual({ x: -100, y: -75, z: 0 });
  });

  test('is the same number all the way through a move', () => {
    /*
     * The one that matters. Both positions change as the machine travels and
     * their difference does not — but in binary floating point the
     * subtraction does not say so, and anything memoised on the result sees a
     * new value several times a second. On the toolpath screen that was the
     * camera snapping back to isometric the moment a jog started.
     */
    const wco = -15.836;
    const seen = new Set();

    for (let i = 0; i <= 500; i += 1) {
      const mpos = Number((-100 - (i * 0.1)).toFixed(3));
      const wpos = Number((mpos - wco).toFixed(3));
      seen.add(workOffset({ x: mpos, y: 0, z: 0 }, { x: wpos, y: 0, z: 0 }).x);
    }

    expect(seen.size).toBe(1);
    expect([...seen][0]).toBe(wco);
  });

  test('keeps everything a controller can actually report', () => {
    // Three decimals is the reporting precision; rounding must not reach it.
    const offset = workOffset({ x: 0.001, y: -0.002, z: 12.345 }, { x: 0, y: 0, z: 0 });
    expect(offset).toEqual({ x: 0.001, y: -0.002, z: 12.345 });
  });

  test('is nothing until both positions have arrived', () => {
    expect(workOffset({ x: -100, y: -50, z: -10 }, { x: 0, y: null, z: 0 })).toBeNull();
    expect(workOffset(null, { x: 0, y: 0, z: 0 })).toBeNull();
  });
});
