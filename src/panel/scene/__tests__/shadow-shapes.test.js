import { closedLoops } from '../shadow-shapes';

/** Line-segment pairs, flat, from a list of points walked in order. */
const walk = (points) => {
  const out = [];
  for (let i = 1; i < points.length; i += 1) {
    out.push(points[i - 1][0], points[i - 1][1], -5, points[i][0], points[i][1], -5);
  }
  return out;
};

const SQUARE = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

describe('finding the closed outlines', () => {
  test('a path that returns to its start is a face', () => {
    const loops = closedLoops(walk(SQUARE));

    expect(loops).toHaveLength(1);
    expect(loops[0][0]).toEqual([0, 0]);
  });

  test('a path that never closes is not', () => {
    // An open profile encloses nothing, so there is no area to shade.
    expect(closedLoops(walk([[0, 0], [10, 0], [10, 10]]))).toHaveLength(0);
  });

  test('closes on near-enough, because arcs land a hair off', () => {
    // Arcs are emitted as chords, so the last one rarely hits the exact
    // point it was computed from.
    const almost = [[0, 0], [10, 0], [10, 10], [0, 10], [0.0004, -0.0003]];
    expect(closedLoops(walk(almost))).toHaveLength(1);
  });

  test('a jump in the path ends whatever was being traced', () => {
    // Two squares with a rapid between them: two faces, not one shape that
    // wanders across the gap.
    const first = walk(SQUARE);
    const second = walk(SQUARE.map(([x, y]) => [x + 50, y + 50]));
    expect(closedLoops([...first, ...second])).toHaveLength(2);
  });

  test('drops a loop too small to be an area', () => {
    // Three points a few microns apart is a rounding artefact.
    const speck = [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0]];
    expect(closedLoops(walk(speck))).toHaveLength(0);
  });

  test('keeps only the plan, because a shadow is flat', () => {
    const loops = closedLoops(walk(SQUARE));
    expect(loops[0].every((p) => p.length === 2)).toBe(true);
  });

  test('stops rather than building a face per pass on a roughing job', () => {
    // A pocket cleared in many step-downs closes a loop every pass; the
    // shadow is a hint about where the work is, not a second render of it.
    const many = [];
    for (let i = 0; i < 900; i += 1) {
      many.push(...walk(SQUARE.map(([x, y]) => [x + (i * 40), y])));
    }
    expect(closedLoops(many).length).toBeLessThanOrEqual(400);
  });
});
