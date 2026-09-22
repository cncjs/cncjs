import {
  placeAt, pressBars, responseTimes, travelled, withinWindow, WINDOW_MS,
} from '../jog-trace';

const key = (t, k, down) => ({ kind: 'key', t, key: k, down });
const segment = (t) => ({ kind: 'segment', t });
const at = (t, x, y = 0, z = 0) => ({ kind: 'position', t, x, y, z });

describe('keeping a window of history', () => {
  test('forgets what has scrolled off the left', () => {
    const events = [key(0, 'ArrowUp', true), key(11000, 'ArrowUp', false)];
    expect(withinWindow(events, 12500)).toHaveLength(1);
  });

  test('places now at the right-hand edge', () => {
    // A recording reads the way a person watches one: what just happened is
    // where the eye already is.
    expect(placeAt(1000, 1000)).toBe(1);
    expect(placeAt(1000 - WINDOW_MS, 1000)).toBe(0);
    expect(placeAt(1000 - (WINDOW_MS / 2), 1000)).toBeCloseTo(0.5, 9);
  });

  test('clamps rather than drawing off the edge', () => {
    expect(placeAt(-99999, 0)).toBe(0);
    expect(placeAt(99999, 0)).toBe(1);
  });
});

describe('what was held down', () => {
  test('pairs each press with its release', () => {
    const bars = pressBars([
      key(100, 'ArrowUp', true),
      key(400, 'ArrowUp', false),
    ], 500);

    expect(bars).toEqual([{ key: 'ArrowUp', from: 100, to: 400 }]);
  });

  test('a key still down runs to the edge, because it is still down', () => {
    const bars = pressBars([key(100, 'ArrowUp', true)], 900);
    expect(bars).toEqual([{ key: 'ArrowUp', from: 100, to: 900, held: true }]);
  });

  test('two keys at once are two bars, which is what a diagonal looks like', () => {
    const bars = pressBars([
      key(100, 'ArrowUp', true),
      key(150, 'ArrowRight', true),
      key(400, 'ArrowUp', false),
      key(450, 'ArrowRight', false),
    ], 500);

    expect(bars).toHaveLength(2);
    // They overlap: that overlap is the diagonal.
    expect(bars[0].to).toBeGreaterThan(bars[1].from);
  });
});

describe('how quickly the press was answered', () => {
  test('measures to the first segment that went out', () => {
    const answers = responseTimes([
      key(100, 'ArrowUp', true),
      segment(180),
      segment(200),
      key(400, 'ArrowUp', false),
    ]);

    expect(answers).toEqual([{ key: 'ArrowUp', at: 100, ms: 80 }]);
  });

  test('a press that produced nothing is recorded as nothing, not skipped', () => {
    /*
     * The case worth seeing. A key held with no segment behind it is the
     * "sometimes it does not catch" complaint, and averaging it away would
     * hide exactly the event being looked for.
     */
    const answers = responseTimes([
      key(100, 'ArrowUp', true),
      key(400, 'ArrowUp', false),
    ]);

    expect(answers).toEqual([{ key: 'ArrowUp', at: 100, ms: null }]);
  });

  test('a second key during a held one is not a second question', () => {
    // Adding a key to make a diagonal does not restart anything: the move is
    // already running, so there is nothing new to answer.
    const answers = responseTimes([
      key(100, 'ArrowUp', true),
      segment(180),
      key(200, 'ArrowRight', true),
      segment(220),
    ]);

    expect(answers).toHaveLength(1);
  });
});

describe('how far it actually went', () => {
  test('adds up the path rather than the straight line from end to end', () => {
    // Out and back is 20mm of travel, not nothing — which is the difference
    // between "it moved twice" and "it ended up where it started".
    expect(travelled([at(0, 0), at(1, 10), at(2, 0)])).toBeCloseTo(20, 9);
  });

  test('is nothing when there is nothing to compare', () => {
    expect(travelled([])).toBe(0);
    expect(travelled([at(0, 0)])).toBe(0);
  });
});
