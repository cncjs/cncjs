import {
  buildGrid, buildSubGrid, FADE_CELLS, fineStep, gridStep,
} from '../grid-lines';

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

describe('fineStep', () => {
  test('divides a square into four or five, never two', () => {
    // Two divisions read as a second grid arguing with the first.
    expect(fineStep(100)).toBe(20);
    expect(fineStep(50)).toBe(10);
    expect(fineStep(1000)).toBe(200);
  });

  test('falls to a quarter when a fifth is not a number anyone counts in', () => {
    // A fifth of 200 is 40, which is not in the table.
    expect(fineStep(200)).toBe(50);
  });

  test('gives up rather than inventing a spacing', () => {
    // Nothing in the table divides 1mm, and a sub-grid on the wrong spacing
    // is worse than none.
    expect(fineStep(1)).toBeNull();
  });

  test('always returns something the grid itself could have used', () => {
    const table = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (const step of table) {
      const fine = fineStep(step);
      if (fine !== null) {
        expect(table).toContain(fine);
        expect(fine).toBeLessThan(step);
      }
    }
  });
});

describe('buildSubGrid', () => {
  const AREA = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };

  const read = (geometry) => {
    const position = geometry.getAttribute('position').array;
    const color = geometry.getAttribute('color').array;
    const out = [];
    for (let i = 0; i < position.length; i += 3) {
      out.push({ x: position[i], y: position[i + 1], a: color[(i / 3) * 4 + 3] });
    }
    return out;
  };

  test('runs past the machine, like the grid it subdivides', () => {
    // It used to stop dead at the travel while the coarse lines carried on,
    // which drew exactly the rectangle the fade exists to avoid.
    const v = read(buildSubGrid(AREA, -150, '#000000', 20, 100));

    expect(Math.min(...v.map((p) => p.x))).toBeLessThan(AREA.min.x);
    expect(Math.max(...v.map((p) => p.x))).toBeGreaterThan(AREA.max.x);
    expect(Math.min(...v.map((p) => p.y))).toBeLessThan(AREA.min.y);
  });

  test('fades out on the same margin as the coarse grid', () => {
    const v = read(buildSubGrid(AREA, -150, '#000000', 20, 100));
    const margin = 100 * FADE_CELLS;

    const inside = v.filter((p) => p.x >= AREA.min.x && p.x <= AREA.max.x &&
      p.y >= AREA.min.y && p.y <= AREA.max.y);
    expect(inside.every((p) => p.a === 1)).toBe(true);

    const out = v.filter((p) => p.x <= AREA.min.x - margin + 1e-6);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((p) => p.a < 0.02)).toBe(true);
  });

  test('is segmented by the coarse square, not the fine one', () => {
    /*
     * The fade runs over six coarse squares, so that is all the resolution it
     * needs; splitting at every fine line would be five times the geometry
     * for the same gradient.
     *
     * Counted as segments per line rather than as a total, because `coarse`
     * also sets the margin — passing a different one changes how far the grid
     * reaches as well as how it is cut, so the totals are not comparable.
     */
    const v = read(buildSubGrid(AREA, -150, '#000000', 20, 100));

    const span = { x: 1000 + (2 * 600), y: 700 + (2 * 600) };
    const lines = Math.round(span.x / 20) + Math.round(span.y / 20);
    const perLine = (v.length / 2) / lines;

    // A coarse cut over that span is about twenty pieces; a fine one is a
    // hundred.
    expect(perLine).toBeLessThan(30);
    expect(perLine).toBeGreaterThan(5);
  });
});
