import controller from '../controller';
import {
  cancelTravel, canGoToPoint, canGoToWorkZero, goToPoint, goToPointLines,
  goToWorkZero, goToWorkZeroLines,
} from '../goto';

jest.mock('../controller', () => ({ command: jest.fn() }));

// A default Grbl: homes to the maximum, so the reachable volume is negative
// and the top of Z travel is machine zero.
const HOMES_TO_MAX = {
  settings: {
    $130: '1000', $131: '700', $132: '150', $23: '0', $110: '5000', $112: '3000',
  },
};

// The Z bit set in `$23`: this machine homes Z at the bottom, machine zero is
// the table, and the top of travel is `$132`.
const Z_HOMES_TO_MIN = {
  settings: {
    $130: '1000', $131: '700', $132: '150', $23: '4', $110: '5000', $112: '3000',
  },
};

describe('going back to the work zero', () => {
  beforeEach(() => controller.command.mockClear());

  test('lifts Z before it crosses the work', () => {
    // The whole reason this exists. cncjs sends a bare `G0 X0 Y0`, which on a
    // machine with the tool down is a cut across the stock at that depth.
    const lines = goToWorkZeroLines(HOMES_TO_MAX);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Z');
    expect(lines[1]).toContain('X0 Y0');
    // The second move is in work coordinates — no `G53` on it.
    expect(lines[1]).not.toContain('G53');
  });

  test('retracts to the top of travel, not to G53 Z0', () => {
    // On this machine they are the same place, which is exactly why the next
    // test matters: a version that hard-coded `Z0` would pass this one.
    expect(goToWorkZeroLines(HOMES_TO_MAX)[0]).toBe('$J=G53 G90 G21 Z0 F3000');
  });

  test('travels as a jog, so it can be called off', () => {
    // `G0` is in the planner the moment it is accepted and the only way out
    // is a feed hold and a reset — which stops by abandoning the planner and
    // leaves the position in doubt. `$J=` is cancelled cleanly.
    expect(goToWorkZeroLines(HOMES_TO_MAX).every((l) => l.startsWith('$J='))).toBe(true);
  });

  test('runs at the axis maximum the firmware reports', () => {
    const [z, xy] = goToWorkZeroLines(HOMES_TO_MAX);
    expect(z).toContain('F3000');
    expect(xy).toContain('F5000');
  });

  test('falls back to a bounded rate when the machine has not said', () => {
    const quiet = { settings: { $130: '200', $131: '200', $132: '200', $23: '0' } };
    expect(goToWorkZeroLines(quiet)[0]).toContain('F2000');
  });

  test('on a machine that homes Z at the bottom, the top is $132 and not zero', () => {
    // `G53 Z0` here is the table. Getting this backwards drives the tool down
    // the full travel instead of up it.
    expect(goToWorkZeroLines(Z_HOMES_TO_MIN)[0]).toBe('$J=G53 G90 G21 Z150 F3000');
  });

  test('states absolute mode, because both lines are meaningless without it', () => {
    // `G0 X0 Y0` in G91 means "do not move" — a button that silently does
    // nothing, which is worse than one that errors.
    expect(goToWorkZeroLines(HOMES_TO_MAX)[0]).toContain('G90');
  });

  test('offers nothing when the machine has not said how far Z goes', () => {
    // Without a known top there is no retract, and what is left is the bare
    // `G0 X0 Y0` this exists to avoid.
    expect(goToWorkZeroLines({})).toBeNull();
    expect(canGoToWorkZero({})).toBe(false);
    expect(canGoToWorkZero(HOMES_TO_MAX)).toBe(true);
  });

  test('sends both lines, in order, and nothing when it cannot', () => {
    goToWorkZero(HOMES_TO_MAX);
    expect(controller.command.mock.calls).toEqual([
      ['gcode', '$J=G53 G90 G21 Z0 F3000'],
      ['gcode', '$J=G90 G21 X0 Y0 F5000'],
    ]);

    controller.command.mockClear();
    expect(goToWorkZero({})).toBeNull();
    expect(controller.command).not.toHaveBeenCalled();
  });
});

describe('travelling to a point picked off the drawing', () => {
  beforeEach(() => controller.command.mockClear());

  test('lifts Z first, then travels in machine coordinates', () => {
    // `G53` and not a work move: the scene is drawn in machine coordinates,
    // so that is the frame the cursor reported in.
    expect(goToPointLines(HOMES_TO_MAX, { x: -412.5, y: -233.25 })).toEqual([
      '$J=G53 G90 G21 Z0 F3000',
      '$J=G53 G90 G21 X-412.5 Y-233.25 F5000',
    ]);
  });

  test('rounds off what the mouse knows and the machine does not', () => {
    expect(goToPointLines(HOMES_TO_MAX, { x: -412.38471629, y: -233.0000004 })[1])
      .toBe('$J=G53 G90 G21 X-412.385 Y-233 F5000');
  });

  test('refuses a point outside the machine travel', () => {
    // Soft limits on, this alarms and needs a reset; off, it drives into a
    // limit switch. Either way it is not something to find out by pointing
    // slightly wide of the bed.
    expect(goToPointLines(HOMES_TO_MAX, { x: -412, y: 50 })).toBeNull();
    expect(goToPointLines(HOMES_TO_MAX, { x: -1400, y: -233 })).toBeNull();
    expect(canGoToPoint(HOMES_TO_MAX, { x: -412, y: -233 })).toBe(true);
  });

  test('the edge of the travel is inside it', () => {
    expect(goToPointLines(HOMES_TO_MAX, { x: -1000, y: 0 })).not.toBeNull();
    expect(goToPointLines(HOMES_TO_MAX, { x: 0, y: -700 })).not.toBeNull();
  });

  test('refuses when there is no point, or no envelope to check it against', () => {
    expect(goToPointLines(HOMES_TO_MAX, null)).toBeNull();
    expect(goToPointLines({}, { x: -412, y: -233 })).toBeNull();
    expect(canGoToPoint({}, { x: -412, y: -233 })).toBe(false);
  });

  test('sends both lines, and nothing when it refuses', () => {
    goToPoint(HOMES_TO_MAX, { x: -412.5, y: -233.25 });
    expect(controller.command.mock.calls).toEqual([
      ['gcode', '$J=G53 G90 G21 Z0 F3000'],
      ['gcode', '$J=G53 G90 G21 X-412.5 Y-233.25 F5000'],
    ]);

    controller.command.mockClear();
    expect(goToPoint(HOMES_TO_MAX, { x: -412, y: 50 })).toBeNull();
    expect(controller.command).not.toHaveBeenCalled();
  });
});

describe('calling a travel off', () => {
  beforeEach(() => controller.command.mockClear());

  test('uses the jog cancel, not a reset', () => {
    // `0x85` drops what is left of the move and decelerates normally; the
    // position stays known and the work offsets survive. A soft reset would
    // also stop it and would take both with it.
    cancelTravel();
    expect(controller.command).toHaveBeenCalledWith('jogCancel');
  });
});
