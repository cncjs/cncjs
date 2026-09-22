import { buildGrid, FADE_CELLS, gridLabels, gridStep } from '../grid-lines';

/**
 * The one piece of arithmetic in the grid, and the one that decides whether it
 * reads as a surface or as a grey wash.
 */
describe('gridStep', () => {
  test.each([
    // A 200mm machine, which is COM3: 20mm squares, ten across.
    [200, 20],
    // A small part measured in a few millimetres still gets squares somebody
    // can count rather than one square with the part inside it.
    [10, 1],
    [30, 2],
    [80, 5],
    // A metre-plus gantry. Lines every 100mm, not every 68.75.
    [1200, 100],
    [2500, 200],
  ])('%dmm across gets %dmm squares', (extent, step) => {
    expect(gridStep(extent)).toBe(step);
  });

  test('never divides the view into more than it can show', () => {
    for (let extent = 1; extent <= 3000; extent += 7) {
      expect(extent / gridStep(extent)).toBeLessThanOrEqual(16);
    }
  });

  test('lands on numbers a machinist reads, not on the extent over sixteen', () => {
    // 137mm would be 8.5625mm squares if the step were computed rather than
    // chosen, and every line would sit at a number nobody can use.
    expect(gridStep(137)).toBe(10);
    expect(gridStep(137) % 1).toBe(0);
  });

  test('has a coarsest step rather than running off the end of the list', () => {
    // A machine this large does not exist, and a grid with no answer for it
    // would return undefined and draw nothing at all.
    expect(gridStep(10 ** 9)).toBe(1000);
  });
});

describe('buildGrid', () => {
  // COM3: the reachable volume is [-200, 0] on every axis.
  const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };

  const attr = (geometry, name) => geometry.getAttribute(name);
  const xs = (geometry) => {
    const p = attr(geometry, 'position');
    return Array.from({ length: p.count }, (_, i) => p.getX(i));
  };
  const alphas = (geometry) => {
    const c = attr(geometry, 'color');
    return Array.from({ length: c.count }, (_, i) => c.getW(i));
  };

  test('reaches past the area by the fade, on every side', () => {
    const { lines, axes, step, margin } = buildGrid(COM3, 0, '#6d7886');

    expect(step).toBe(20);
    expect(margin).toBe(20 * FADE_CELLS);

    const all = [...xs(lines), ...xs(axes)];
    // The machine stops at -200 and 0; the ground carries on six squares.
    expect(Math.min(...all)).toBe(-320);
    expect(Math.max(...all)).toBe(120);
  });

  test('is solid across the machine and gone at the far edge', () => {
    const { lines } = buildGrid(COM3, 0, '#6d7886');
    const a = alphas(lines);

    expect(Math.max(...a)).toBeCloseTo(1, 5);
    expect(Math.min(...a)).toBeCloseTo(0, 5);
  });

  test('carries the alpha on the vertices, not on the material', () => {
    // The whole point: one opacity for the draw call is the hard edge this
    // replaces. Four components per vertex is what makes a fade possible.
    const { lines } = buildGrid(COM3, 0, '#6d7886');
    expect(attr(lines, 'color').itemSize).toBe(4);
  });

  test('lays every line at the height it is given', () => {
    const { lines } = buildGrid(COM3, -200, '#6d7886');
    const position = attr(lines, 'position');

    for (let i = 0; i < position.count; i += 1) {
      expect(position.getZ(i)).toBe(-200);
    }
  });

  test('keeps the lines through zero apart from the rest', () => {
    const { axes } = buildGrid(COM3, 0, '#6d7886');
    const position = attr(axes, 'position');

    // Every vertex of the emphasised set is on x=0 or on y=0.
    for (let i = 0; i < position.count; i += 1) {
      expect(position.getX(i) === 0 || position.getY(i) === 0).toBe(true);
    }
    expect(position.count).toBeGreaterThan(0);
  });

  test('splits each line into a segment per square so it can fade along it', () => {
    // One long segment per line cannot fade: a vertex is the only thing that
    // carries an alpha, and a line with two of them has an alpha at each end
    // and a straight blend between.
    const { lines } = buildGrid(COM3, 0, '#6d7886');
    const a = alphas(lines);
    const distinct = new Set(a.map((value) => value.toFixed(3)));

    expect(distinct.size).toBeGreaterThan(4);
  });
});

describe('gridLabels', () => {
  const COM3 = { min: { x: -200, y: -200, z: -200 }, max: { x: 0, y: 0, z: 0 } };
  const numbers = (labels) => labels.filter((l) => l.text !== 'mm');

  test('runs along the two near edges, outside the machine rather than in it', () => {
    const labels = gridLabels(COM3, 20);
    const alongX = numbers(labels).filter((l) => l.y === -210);
    const alongY = numbers(labels).filter((l) => l.x === -210);

    // Half a square clear of the edge, so a figure never lands on the
    // toolpath it is there to measure.
    expect(alongX.length).toBeGreaterThan(0);
    expect(alongY.length).toBeGreaterThan(0);
    expect(alongX.map((l) => l.text)).toContain('-200');
    expect(alongX.map((l) => l.text)).toContain('0');
  });

  test('stops at the machine and does not number the fade', () => {
    // Out there the grid is a hint that the floor continues. A number would
    // be a measurement of nothing.
    const values = numbers(gridLabels(COM3, 20)).map((l) => Number(l.text));

    expect(Math.min(...values)).toBe(-200);
    expect(Math.max(...values)).toBe(0);
  });

  test('thins out rather than crowding when there are many lines', () => {
    // 1mm squares over 200mm is two hundred lines. Labelling each one is
    // unreadable at any size this panel is looked at.
    const dense = numbers(gridLabels(COM3, 1));

    expect(dense.length).toBeLessThanOrEqual(2 * 12);
    // And what survives is still on round numbers.
    expect(dense.every((l) => Number.isInteger(Number(l.text)))).toBe(true);
  });

  test('says the unit once per axis, past the end of the numbers', () => {
    const units = gridLabels(COM3, 20).filter((l) => l.text === 'mm');

    expect(units).toHaveLength(2);
    // Clear of the last figure, so it reads as the unit for the row rather
    // than as another value in it.
    expect(units.map((u) => u.x)).toContain(20);
    expect(units.map((u) => u.y)).toContain(20);
  });

  test('gives every label a key of its own', () => {
    const labels = gridLabels(COM3, 20);
    expect(new Set(labels.map((l) => l.key)).size).toBe(labels.length);
  });
});
