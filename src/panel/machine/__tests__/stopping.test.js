import { accelerationFor, stoppingDistance } from '../stopping';

const SETTINGS = { settings: { $120: '500.000', $121: '500.000', $122: '300.000' } };

describe('which acceleration governs a move', () => {
  test('is the axis involved', () => {
    expect(accelerationFor(['x'], SETTINGS)).toBe(500);
    expect(accelerationFor(['z'], SETTINGS)).toBe(300);
  });

  test('is the slowest of them on a diagonal', () => {
    // A diagonal stops no faster than its most sluggish part.
    expect(accelerationFor(['x', 'z'], SETTINGS)).toBe(300);
  });

  test('is nothing when the machine has not said', () => {
    expect(accelerationFor(['x'], {})).toBeNull();
    expect(accelerationFor(['x'], { settings: { $120: '0' } })).toBeNull();
  });
});

describe('how far it goes after the key comes up', () => {
  test('is the queued travel plus the distance spent slowing down', () => {
    /*
     * 1500 mm/min is 25 mm/s. A 46ms stop is 1.15mm still queued, and
     * slowing from 25 mm/s at 500 mm/s² takes another 0.625mm.
     */
    const distance = stoppingDistance({
      timing: { stopMs: 46 },
      feedrate: 1500,
      acceleration: 500,
    });

    expect(distance).toBeCloseTo(1.15 + 0.625, 6);
  });

  test('grows with the square of the feed rate, which is the point of saying it', () => {
    const slow = stoppingDistance({ timing: { stopMs: 46 }, feedrate: 1500, acceleration: 500 });
    const fast = stoppingDistance({ timing: { stopMs: 46 }, feedrate: 5000, acceleration: 500 });

    // Three times the feed is more than three times the distance.
    expect(fast).toBeGreaterThan(slow * 3);
  });

  test('says nothing rather than half of it', () => {
    /*
     * Half this number would read as a measured safety margin that nobody
     * measured — worse than an empty space, which at least asks a question.
     */
    expect(stoppingDistance({ timing: null, feedrate: 1500, acceleration: 500 })).toBeNull();
    expect(stoppingDistance({ timing: { stopMs: 46 }, feedrate: 0, acceleration: 500 })).toBeNull();
    expect(stoppingDistance({ timing: { stopMs: 46 }, feedrate: 1500, acceleration: null })).toBeNull();
  });
});
