import { buildGuide, guideSpan } from '../guide-lines';

const AREA = { min: { x: -1000, y: -700, z: -150 }, max: { x: 0, y: 0, z: 0 } };
const RGB = { r: 0, g: 0, b: 1 };

const vertices = ({ positions, colors }) => {
  const out = [];
  for (let i = 0; i < positions.length; i += 3) {
    out.push({
      x: positions[i],
      y: positions[i + 1],
      z: positions[i + 2],
      a: colors[(i / 3) * 4 + 3],
    });
  }
  return out;
};

describe('the guide lines through a point', () => {
  test('stop at the machine plus the grid\'s own fade, not at an arbitrary length', () => {
    // The complaint they answer: run out to some made-up reach and they read
    // as an object lying near the point rather than as part of the floor.
    const span = guideSpan(AREA);
    const v = vertices(buildGuide({ x: -500, y: -350 }, AREA, -150, RGB));

    expect(Math.min(...v.map((p) => p.x))).toBeCloseTo(span.min.x, 6);
    expect(Math.max(...v.map((p) => p.x))).toBeCloseTo(span.max.x, 6);
    expect(Math.min(...v.map((p) => p.y))).toBeCloseTo(span.min.y, 6);
    expect(Math.max(...v.map((p) => p.y))).toBeCloseTo(span.max.y, 6);
  });

  test('both lines pass through the point', () => {
    const v = vertices(buildGuide({ x: -500, y: -350 }, AREA, -150, RGB));
    // One line holds Y, the other holds X.
    expect(v.some((p) => p.y === -350)).toBe(true);
    expect(v.some((p) => p.x === -500)).toBe(true);
  });

  test('lie in the plane they were given', () => {
    const v = vertices(buildGuide({ x: -500, y: -350 }, AREA, -42, RGB));
    expect(v.every((p) => p.z === -42)).toBe(true);
  });

  test('are solid over the machine and gone by the end of the fade', () => {
    // The alpha has to be on the vertices: a material carries one opacity for
    // the whole draw, which is the hard edge this avoids.
    const v = vertices(buildGuide({ x: -500, y: -350 }, AREA, -150, RGB));
    const inside = v.filter((p) => p.x >= -1000 && p.x <= 0 && p.y >= -700 && p.y <= 0);
    expect(inside.every((p) => p.a === 1)).toBe(true);

    const span = guideSpan(AREA);
    const edge = v.filter((p) => p.x <= span.min.x + 1e-6 || p.x >= span.max.x - 1e-6);
    expect(edge.length).toBeGreaterThan(0);
    expect(edge.every((p) => p.a < 0.02)).toBe(true);
  });

  test('carry the colour they were handed on every vertex', () => {
    const { colors } = buildGuide({ x: -500, y: -350 }, AREA, -150, { r: 0.2, g: 0.6, b: 0.4 });
    for (let i = 0; i < colors.length; i += 4) {
      expect(colors[i]).toBeCloseTo(0.2, 6);
      expect(colors[i + 1]).toBeCloseTo(0.6, 6);
      expect(colors[i + 2]).toBeCloseTo(0.4, 6);
    }
  });
});
