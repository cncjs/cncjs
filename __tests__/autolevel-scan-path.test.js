/* eslint-env jest */
import { createScanPath } from '../src/app/widgets/Autolevel/scanPath';
import { createProbeXYPoints } from '../src/server/lib/autolevel';

const grid = {
  startX: 0,
  endX: 20,
  stepX: 10,
  startY: 0,
  endY: 20,
  stepY: 10,
};

const A = { x: 0, y: 0 };
const B = { x: 10, y: 0 };
const C = { x: 20, y: 0 };
const D = { x: 0, y: 10 };
const E = { x: 10, y: 10 };
const F = { x: 20, y: 10 };
const G = { x: 0, y: 20 };
const H = { x: 10, y: 20 };
const I = { x: 20, y: 20 };

const orders = [
  ['raster', 'x', [A, B, C, D, E, F, G, H, I]],
  ['raster', 'y', [A, D, G, B, E, H, C, F, I]],
  ['zigzag', 'x', [A, B, C, F, E, D, G, H, I]],
  ['zigzag', 'y', [A, D, G, H, E, B, C, F, I]],
  ['spiral-in', 'x', [A, B, C, F, I, H, G, D, E]],
  ['spiral-in', 'y', [A, D, G, H, I, F, C, B, E]],
  ['spiral-out', 'x', [E, D, G, H, I, F, C, B, A]],
  ['spiral-out', 'y', [E, B, C, F, I, H, G, D, A]],
];

const implementations = [
  ['browser', createScanPath],
  ['server', createProbeXYPoints],
];

describe.each(implementations)('%s scan path', (name, createPath) => {
  test.each(orders)('%s along %s has the expected literal visit order', (scanPattern, scanDirection, expected) => {
    expect(createPath({ ...grid, scanPattern, scanDirection })).toEqual(expected);
  });

  test.each(orders)('%s along %s visits each single-row and single-column point once', (scanPattern, scanDirection) => {
    const options = { ...grid, scanPattern, scanDirection };
    const row = createPath({ ...options, endY: 0 });
    const column = createPath({ ...options, endX: 0 });
    expect(row).toHaveLength(3);
    expect(row).toEqual(expect.arrayContaining([A, B, C]));
    expect(column).toHaveLength(3);
    expect(column).toEqual(expect.arrayContaining([A, D, G]));
  });

  test('does not stretch a non-divisible axis to the end bound', () => {
    expect(createPath({ ...grid, endX: 25, endY: 0 })).toEqual([A, B, C]);
    expect(createPath({ ...grid, endX: 0, endY: 25 })).toEqual([A, D, G]);
  });

  test('includes an endpoint within floating-point epsilon', () => {
    expect(createPath({ ...grid, endX: 0.3, stepX: 0.1, endY: 0 })).toEqual([
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 0.2, y: 0 },
      { x: 0.3, y: 0 },
    ]);
    expect(createPath({ ...grid, endX: 0, endY: 0.3, stepY: 0.1 })).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0.1 },
      { x: 0, y: 0.2 },
      { x: 0, y: 0.3 },
    ]);
  });

  test.each([
    [{ scanPattern: 'unknown' }, 'Unsupported scan pattern: unknown'],
    [{ scanDirection: 'z' }, 'Unsupported scan direction: z'],
    [{ stepX: 0 }, 'Axis start, end, and step must be finite, with step > 0'],
    [{ stepY: -1 }, 'Axis start, end, and step must be finite, with step > 0'],
    [{ stepX: NaN }, 'Axis start, end, and step must be finite, with step > 0'],
    [{ stepY: Infinity }, 'Axis start, end, and step must be finite, with step > 0'],
    [{ startX: NaN }, 'Axis start, end, and step must be finite, with step > 0'],
    [{ endY: Infinity }, 'Axis start, end, and step must be finite, with step > 0'],
    [{ startX: 21 }, 'Axis end must be greater than or equal to start'],
    [{ startY: 21 }, 'Axis end must be greater than or equal to start'],
  ])('rejects invalid options %j with the specified RangeError', (invalid, message) => {
    expect(() => createPath({ ...grid, ...invalid })).toThrow(RangeError);
    expect(() => createPath({ ...grid, ...invalid })).toThrow(message);
  });
});
