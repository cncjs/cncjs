import { fineStep } from '../grid-lines';
import { gridLabels, labelStep } from '../grid-numbers';

/**
 * What the grid says, as opposed to how it is drawn.
 *
 * Split from `grid.test.js` alongside the module it covers: the other file is
 * about geometry the renderer consumes, this one about which round number to
 * count in, where to put it, and which one gives way when two collide.
 */

describe('gridLabels', () => {
  const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };
  const numbers = (labels) => labels.filter((l) => l.text !== 'mm');

  test('runs along the zero lines of the machine, not the far edges', () => {
    // COM3 homes to the maximum, so zero is the top-right corner of the
    // travel and both rows of figures start from it.
    const labels = gridLabels(COM3, 20);
    const alongX = numbers(labels).filter((l) => l.key.startsWith('x'));
    const alongY = numbers(labels).filter((l) => l.key.startsWith('y'));

    expect(alongX.length).toBeGreaterThan(0);
    expect(alongY.length).toBeGreaterThan(0);
    expect(alongX.every((l) => l.y === 0)).toBe(true);
    expect(alongY.every((l) => l.x === 0)).toBe(true);

    /*
     * Pushed clear of the work rather than into it — and how far is the
     * caller's business, because it has to be a fixed distance on screen. As
     * a fraction of the label spacing the figures marched away from their
     * line every time the numbers coarsened.
     */
    expect(alongX.every((l) => l.push.x === 0 && l.push.y === 1)).toBe(true);
    expect(alongY.every((l) => l.push.x === 1 && l.push.y === 0)).toBe(true);
  });

  test('follows zero to the other end when the machine homes that way', () => {
    // With the axis bit set in `$23` the travel is [0, range] and zero is the
    // bottom-left corner instead. The figures have to follow it.
    const flipped = { min: { x: 0, y: 0, z: 0 }, max: { x: 200, y: 200, z: 200 } };
    const labels = numbers(gridLabels(flipped, 20));

    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.y === 0)).toBe(true);
    expect(labels.filter((l) => l.key.startsWith('x')).every((l) => l.push.y === -1)).toBe(true);
  });

  test('stops at the machine and does not number the fade', () => {
    // Out there the grid is a hint that the floor continues. A number would
    // be a measurement of nothing.
    const values = numbers(gridLabels(COM3, 20)).map((l) => Number(l.text));

    expect(Math.min(...values)).toBe(-200);
    expect(Math.max(...values)).toBe(0);
  });

  test('is capped however fine the spacing gets', () => {
    // 1mm squares over 200mm is two hundred lines. `labelStep` is what
    // normally keeps the figures apart; this cap is the backstop behind it,
    // because every label is a painted canvas and a texture.
    const dense = numbers(gridLabels(COM3, 1));

    expect(dense.length).toBeLessThanOrEqual(2 * 40);
    // And what survives is still on round numbers.
    expect(dense.every((l) => Number.isInteger(Number(l.text)))).toBe(true);
  });

  test('says the unit once, where both rows of figures begin', () => {
    // Twice was twice the ink for one fact, and each copy drifted along its
    // own axis whenever the counting coarsened.
    const units = gridLabels(COM3, 20).filter((l) => l.text === 'mm');

    expect(units).toHaveLength(1);
    // Anchored where the two zero lines cross, which for COM3 is the origin.
    expect([units[0].x, units[0].y]).toEqual([0, 0]);
  });

  test('the unit does not move when the counting coarsens', () => {
    const coarse = gridLabels(COM3, 100).filter((l) => l.text === 'mm');
    const fine = gridLabels(COM3, 20).filter((l) => l.text === 'mm');

    expect(coarse.map((l) => [l.x, l.y])).toEqual(fine.map((l) => [l.x, l.y]));
  });

  test('gives every label a key of its own', () => {
    const labels = gridLabels(COM3, 20);
    expect(new Set(labels.map((l) => l.key)).size).toBe(labels.length);
  });
});

describe('labelStep', () => {
  // A 100mm grid, which is what a metre of travel produces.
  const GRID = 100;

  test('counts in coarser numbers as the view pulls back', () => {
    // The figures thin out rather than shrinking. Zoomed out to a fifth of a
    // pixel per millimetre, a label every 100mm would be 20px apart.
    expect(labelStep(GRID, 0.2)).toBeGreaterThan(GRID);
    expect(labelStep(GRID, 0.2)).toBe(500);
  });

  test('counts in finer ones as it closes in', () => {
    // Closing in, the coarse spacing leaves acres between figures. At four
    // pixels per millimetre a 20mm square is 80px across, which is room for
    // a figure — so that is what it counts in.
    expect(labelStep(GRID, 4)).toBeLessThan(GRID);
    expect(labelStep(GRID, 4)).toBe(20);
  });

  test('leaves room for the widest figure it will ever print', () => {
    // Whatever rung it lands on, two neighbouring numbers have to be further
    // apart on screen than one of them is wide — four digits at the label
    // size is about 45px.
    for (let zoom = 0.05; zoom < 40; zoom *= 1.13) {
      expect(labelStep(10, zoom) * zoom).toBeGreaterThanOrEqual(45);
    }
  });

  test('never goes finer than the lines there are to point at', () => {
    // Closed right in, the finest it may count in is the sub-grid — which for
    // a 100mm square is 20mm. A number against empty floor points at nothing.
    expect(labelStep(GRID, 1000)).toBe(fineStep(GRID));
    expect(labelStep(GRID, 1000)).toBe(20);
  });

  test('only ever lands on numbers a machinist counts in', () => {
    const rungs = new Set();
    for (let zoom = 0.05; zoom < 40; zoom *= 1.08) {
      rungs.add(labelStep(10, zoom));
    }
    // Every value that comes out is from the table the grid is spaced from —
    // including below the grid's own square, down as far as the sub-grid.
    const table = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    expect([...rungs].every((r) => table.includes(r))).toBe(true);
  });

  test('is stable, not jittery, across a zoom sweep', () => {
    // It may only ever coarsen as the view pulls back. A step that went up
    // and down again would flicker the numbers on and off mid-gesture.
    let previous = 0;
    for (let zoom = 20; zoom > 0.05; zoom /= 1.05) {
      const now = labelStep(10, zoom);
      expect(now).toBeGreaterThanOrEqual(previous);
      previous = now;
    }
  });
});

describe('naming the far end of the travel', () => {
  // 700mm counted in five-hundreds stops at -500, leaving the one figure an
  // operator most wants — how far the machine goes — unsaid.
  const AWKWARD = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
  const numbersOn = (labels, axis) => labels
    .filter((l) => l.text !== 'mm' && l.key.startsWith(axis))
    .map((l) => Number(l.text));

  test('says the reach even when the step does not divide it', () => {
    const labels = gridLabels(AWKWARD, 500);

    expect(numbersOn(labels, 'y')).toContain(-700);
    // Zero is the shared origin now, so it is not in either row.
    expect(labels.some((l) => l.key === 'origin' && l.text === '0')).toBe(true);
  });

  test('keeps the neighbour when there is room for both', () => {
    // -500 and -700 are 200 apart against a 500 step: two fifths, which is
    // not a collision.
    expect(numbersOn(gridLabels(AWKWARD, 500), 'y')).toContain(-500);
  });

  test('drops the neighbour when the two would share a space', () => {
    // 1000 counted in five-hundreds lands on -1000 exactly, so nothing is
    // added; make the range awkward by a hair instead.
    const tight = { min: { x: -1050, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
    const x = numbersOn(gridLabels(tight, 500), 'x');

    expect(x).toContain(-1050);
    expect(x).not.toContain(-1000);
  });

  test('adds nothing when the step already lands on the end', () => {
    const x = numbersOn(gridLabels(AWKWARD, 500), 'x');

    // -1000 is a multiple of 500, so it is there once and only once.
    expect(x.filter((v) => v === -1000)).toHaveLength(1);
  });

  test('follows the reach to the other end on an inverted machine', () => {
    const flipped = { min: { x: 0, y: 0, z: 0 }, max: { x: 1000, y: 700, z: 150 } };
    expect(numbersOn(gridLabels(flipped, 500), 'y')).toContain(700);
  });
});

describe('the shared origin', () => {
  const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };

  test('zero is written once, not once per axis', () => {
    // Both rows meet at the same corner on a machine that homes to the
    // maximum, so two zeros land a few pixels apart and read as a fault.
    const zeros = gridLabels(COM3, 20).filter((l) => l.text === '0');

    expect(zeros).toHaveLength(1);
    expect([zeros[0].x, zeros[0].y]).toEqual([0, 0]);
  });

  test('it leaves both rows along the diagonal', () => {
    const [origin] = gridLabels(COM3, 20).filter((l) => l.text === '0');

    expect(origin.push.x).not.toBe(0);
    expect(origin.push.y).not.toBe(0);
  });

  test('the unit sits in the row of figures, not off the corner', () => {
    // On the diagonal it read as a word floating free of the drawing.
    const [origin] = gridLabels(COM3, 20).filter((l) => l.text === '0');
    const [unit] = gridLabels(COM3, 20).filter((l) => l.text === 'mm');
    const [alongX] = gridLabels(COM3, 20).filter((l) => l.key.startsWith('x'));

    // Same distance off the axis as the numbers it belongs to...
    expect(unit.push.y).toBe(alongX.push.y);
    // ...and clear of the shared zero along it.
    expect(Math.abs(unit.push.x)).toBeGreaterThan(Math.abs(origin.push.x));
  });

  test('every other figure is still said exactly once', () => {
    const counts = new Map();
    for (const label of gridLabels(COM3, 20)) {
      counts.set(label.text, (counts.get(label.text) || 0) + 1);
    }
    // -200 is the far end of both axes, so it is legitimately said twice —
    // once per row. Everything else appears once.
    expect(counts.get('-100')).toBe(2);
    expect(counts.get('0')).toBe(1);
    expect(counts.get('mm')).toBe(1);
  });
});
