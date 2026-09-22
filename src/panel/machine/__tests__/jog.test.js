import controller from '../controller';
import {
  jogLines, jog, jogCancel, jogRoom, jogStart, jogStop, jogTravel,
  canJogContinuously, XY_STEPS, Z_STEPS, FEEDRATES,
} from '../jog';

jest.mock('../controller', () => ({ command: jest.fn() }));

describe('jogLines, on Grbl', () => {
  const grbl = (params) => jogLines({ type: 'Grbl', feedrate: 1500, ...params });

  test('uses $J= and carries the chosen feed rate', () => {
    // The whole reason for `$J=`: the mockup lets an operator choose a jog
    // speed, and `G0` — what the old application sends — is a rapid that
    // ignores it.
    expect(grbl({ moves: { x: 10 } })).toEqual(['$J=G91 G21 X10 F1500']);
  });

  test('is relative, so a jog moves by the step rather than to it', () => {
    // `G91` on the jog line itself, not as a mode change either side of it.
    // An interrupted jog cannot leave the machine in relative mode, because
    // the machine was never put into it.
    expect(grbl({ moves: { z: -1 } })[0]).toContain('G91');
    expect(grbl({ moves: { z: -1 } })).toHaveLength(1);
  });

  test('states millimetres, whatever the machine is currently in', () => {
    // A panel that shows mm must not send inches because the last job left
    // the controller in G20.
    expect(grbl({ moves: { y: 0.1 } })[0]).toContain('G21');
  });

  test('carries the sign of the step', () => {
    expect(grbl({ moves: { x: -0.1 } })[0]).toContain('X-0.1');
  });

  test('a corner is one line with both axes on it', () => {
    // Two lines would be two moves: the machine would run the first to a stop
    // and then set off along the second, drawing an L where the key draws an
    // arrow. One line is one move at 45°.
    expect(grbl({ moves: { x: 10, y: 10 } })).toEqual(['$J=G91 G21 X10 Y10 F1500']);
  });

  test('names the axes in X, Y, Z order however the caller ordered them', () => {
    expect(grbl({ moves: { y: -1, x: 1 } })[0]).toContain('X1 Y-1');
  });

  test('leaves out an axis that is not moving', () => {
    // `Y0` is a valid no-op, but it puts an axis on the line that nobody asked
    // to move, and a jog line is read by whoever is debugging the machine.
    expect(grbl({ moves: { x: 1, y: 0 } })[0]).toContain('X1 F');
  });
});

describe('jogLines, on a firmware without $J=', () => {
  test('falls back to relative-move-absolute, with a feed rate', () => {
    // `G1` and not `G0`: the old application's rapid ignores the speed the
    // operator chose, and this is the one thing worth keeping from its dance.
    expect(jogLines({ type: 'Marlin', moves: { x: 1 }, feedrate: 500 }))
      .toEqual(['G91', 'G1 X1 F500', 'G90']);
  });

  test('puts the machine back into absolute mode', () => {
    // Leaving a machine in G91 is how the next job cuts in the wrong place.
    expect(jogLines({ type: 'TinyG', moves: { z: 1 }, feedrate: 500 }).at(-1)).toBe('G90');
  });
});

describe('sending', () => {
  beforeEach(() => controller.command.mockClear());

  test('a tap is shortened to what is left of the travel', () => {
    /*
     * The same trap a held key fell into, and easier to miss: a relative step
     * off the end of the axis is refused outright with soft limits on — not
     * clipped — so at the edge of the table the key did nothing and said
     * nothing. Shortened rather than refused, so the tool lands exactly on
     * the limit.
     */
    const travel = { settings: { $130: '200', $131: '200', $132: '80' } };
    jog({
      type: 'Grbl',
      moves: { x: 10 },
      feedrate: 1500,
      settings: travel,
      position: { x: '-3', y: '-100', z: '-40' },
    });
    expect(controller.command).toHaveBeenCalledWith('gcode', '$J=G91 G21 X3 F1500');
  });

  test('a tap at the very end sends nothing at all', () => {
    const travel = { settings: { $130: '200', $131: '200', $132: '80' } };
    const sent = jog({
      type: 'Grbl',
      moves: { x: 10 },
      feedrate: 1500,
      settings: travel,
      position: { x: '0', y: '-100', z: '-40' },
    });
    expect(sent).toBe(false);
    expect(controller.command).not.toHaveBeenCalled();
  });

  test('without a position the step is sent as asked', () => {
    // No boundary to measure against, so nothing to shorten it to.
    jog({ type: 'Grbl', moves: { x: 10 }, feedrate: 1500 });
    expect(controller.command).toHaveBeenCalledWith('gcode', '$J=G91 G21 X10 F1500');
  });

  test('every line goes through the controller, in order', () => {
    jog({ type: 'Marlin', moves: { x: 1 }, feedrate: 500 });
    expect(controller.command.mock.calls).toEqual([
      ['gcode', 'G91'],
      ['gcode', 'G1 X1 F500'],
      ['gcode', 'G90'],
    ]);
  });

  test('cancelling is Grbl only, and says nothing elsewhere', () => {
    // A cancel button that quietly does nothing on Marlin would be worse than
    // no button: the move is in the planner and runs to the end either way.
    jogCancel('Grbl');
    expect(controller.command).toHaveBeenCalledWith('jogCancel');

    controller.command.mockClear();
    jogCancel('Marlin');
    expect(controller.command).not.toHaveBeenCalled();
  });
});

describe('what the panel offers', () => {
  test('the steps and speeds the mockup draws, in its order', () => {
    // Written down because they are a design decision, not a default: the
    // drawing shows these six figures and no others.
    expect(XY_STEPS).toEqual([0.1, 1, 10, 50]);
    expect(Z_STEPS).toEqual([0.1, 1, 5]);
    expect(FEEDRATES).toEqual([500, 1500, 3000]);
  });
});

describe('holding a jog key', () => {
  // No `$23`, so the travel is [-range, 0] — a Grbl that homes to the maximum.
  const settings = { settings: { $130: '200.000', $131: '200.000', $132: '80.000' } };
  // Where the tool is, when a test cares. Middle of the table.
  const middle = { x: '-100', y: '-100', z: '-40' };

  beforeEach(() => controller.command.mockClear());

  test('only Grbl may be held, because only Grbl can be told to stop', () => {
    // Smoothie takes `$J=` but has no cancel, so a held key there would commit
    // to the whole distance before the finger came off.
    expect(canJogContinuously('Grbl')).toBe(true);
    expect(canJogContinuously('Smoothie')).toBe(false);
    expect(canJogContinuously('Marlin')).toBe(false);
  });

  test('asks for no more travel than the machine reports having', () => {
    expect(jogTravel('x', settings)).toBe(200);
    expect(jogTravel('z', settings)).toBe(80);
  });

  test('falls back to a bounded distance when the machine has not said', () => {
    // The distance is what happens if the release is never seen. Unbounded is
    // not an option; 100mm is far enough to be useful and near enough that a
    // lost release is a mistake rather than an accident.
    expect(jogTravel('x', {})).toBe(100);
    expect(jogTravel('x', { settings: { $130: 'nonsense' } })).toBe(100);
    expect(jogTravel('x', { settings: { $130: '0' } })).toBe(100);
  });

  test('asks the server to jog, rather than running the loop here', () => {
    /*
     * The loop is driven by `ok`, and only the side holding the serial port
     * sees those — see `src/server/controllers/Grbl/jog.js`. Running it in
     * the browser meant guessing the rhythm, and a guess that sent faster
     * than the machine consumed built a backlog that swallowed every change
     * of direction.
     */
    expect(jogStart('Grbl', { x: 1 }, 1500)).toBe(true);
    expect(controller.command).toHaveBeenCalledWith('jogStart', { x: 1 }, 1500);
  });

  test('aiming somewhere else is the same call again, with no cancel', () => {
    // Cancelling to turn was a race the machine kept losing.
    jogStart('Grbl', { x: 1 }, 1500);
    jogStart('Grbl', { x: 1, y: -1 }, 1500);
    expect(controller.command).toHaveBeenLastCalledWith('jogStart', { x: 1, y: -1 }, 1500);
    expect(controller.command).not.toHaveBeenCalledWith('jogCancel');
  });

  test('offers nothing on a controller that cannot be called off', () => {
    // Smoothie takes `$J=` and has no cancel, so a held key would commit to
    // the whole distance before the finger came up.
    expect(jogStart('Smoothie', { x: 1 }, 1500)).toBe(false);
    expect(controller.command).not.toHaveBeenCalled();
  });

  test('stops with the jog cancel, not a reset', () => {
    // `0x85` abandons the jog and leaves everything else alone. A soft reset
    // would also stop it, and would drop the work offsets with it.
    jogStop('Grbl');
    expect(controller.command).toHaveBeenCalledWith('jogCancel');
  });
});
