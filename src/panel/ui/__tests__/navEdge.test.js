import { readFileSync } from 'fs';
import { join } from 'path';
import { BITE, BITE_ABOVE, EDGE, MOUND, offsetEdge } from '../navEdge';

/** Every `x y` pair out of a path made of moves and lines. */
const points = (d) => d
  .replace(/[ML]/g, ' ')
  .trim()
  .split(/\s+/)
  .reduce((all, n, i) => {
    if (i % 2) {
      all[all.length - 1].push(Number(n));
    } else {
      all.push([Number(n)]);
    }
    return all;
  }, [])
  .filter((p) => p.length === 2 && p.every(Number.isFinite));

/** The bar's own edge, sampled the same way, in screen pixels. */
const barPoints = (width, steps = 400) => {
  const sx = width / 500;
  const at = (p, t) => {
    const u = 1 - t;
    return (u * u * u * p[0]) + (3 * u * u * t * p[1]) + (3 * u * t * t * p[2]) + (t * t * t * p[3]);
  };
  const halves = [
    { x: [150, 215, 200, 250], y: [29.5, 29.5, 3, 3] },
    { x: [250, 300, 285, 350], y: [3, 3, 29.5, 29.5] },
  ];
  const out = [[0, 29.5], [150 * sx, 29.5]];
  for (const half of halves) {
    for (let i = 1; i <= steps; ++i) {
      const t = i / steps;
      out.push([at(half.x, t) * sx, at(half.y, t)]);
    }
  }
  out.push([500 * sx, 29.5]);
  return out;
};

const nearest = ([x, y], curve) => curve.reduce(
  (best, [qx, qy]) => Math.min(best, Math.hypot(x - qx, y - qy)),
  Infinity,
);

describe('navEdge', () => {
  it('builds the whole edge out of the mound', () => {
    // One curve, one string. A shape assembled from copies of a set of
    // control points comes apart the first time one of them is adjusted.
    expect(EDGE).toContain(MOUND);
    expect(EDGE.startsWith('M0 29.5H150')).toBe(true);
    expect(EDGE.endsWith('H500')).toBe(true);
  });

  describe('the bite', () => {
    /*
     * The thing this file exists for.
     *
     * A curve shifted straight up is not a parallel curve: perpendicular
     * distance is the shift times the cosine of the slope, so it pinches
     * where the line is steep. That is what was seen on the phone and what
     * `offsetEdge` replaces, so what is checked is the distance itself.
     */
    const spread = (width, gap) => {
      const bar = barPoints(width);
      const sx = width / 500;
      const gaps = points(offsetEdge(width, gap))
        .map(([x, y]) => [x * sx, y])
        // Across the mound, where the two curves are doing anything at all.
        .filter(([x]) => x > 0.25 * width && x < 0.75 * width)
        .map((p) => nearest(p, bar));

      return { min: Math.min(...gaps), max: Math.max(...gaps) };
    };

    it('keeps the same distance from the bar all the way along', () => {
      const { min, max } = spread(390, 10);

      // The straight shift this replaced measured 7.80 against 10.00.
      expect(max - min).toBeLessThan(0.2);
      expect(min).toBeGreaterThan(9.8);
      expect(max).toBeLessThan(10.2);
    });

    it('holds up at the widths a phone actually is', () => {
      // Computed for a nominal 390 and left there, so this is the error that
      // buys rather than a claim that there is none.
      for (const width of [360, 430]) {
        const { min, max } = spread(width, 10);
        expect(max - min).toBeLessThan(0.2);
      }
    });

    it('carries the section\'s own corners', () => {
      /*
       * The bite is the section's bottom edge now, so the radius is its
       * business. A mask that ended in a straight line cut the card's corners
       * off flat — they live 10px further down, inside the strip it removes.
       *
       * The number is written into `navEdge.js` because the curve is built
       * where there is no document to read a token from, so this is what
       * keeps it equal to `--r-card`.
       */
      const tokens = readFileSync(
        join(__dirname, '..', '..', 'styles', 'tokens.css'),
        'utf8',
      );
      const radius = Number(/--r-card:\s*(\d+)px/.exec(tokens)[1]);

      // Two arcs, one at each end, an ellipse because the box is stretched.
      const arcs = BITE.match(/A[\d.]+ [\d.]+ 0 0 0/g);
      expect(arcs).toHaveLength(2);
      for (const arc of arcs) {
        expect(arc).toContain(` ${radius} 0 0 0`);
      }
    });

    it('rises above the bar, which is why its box has headroom', () => {
      // Offsetting along the normal lifts the crest higher than the shift
      // would: seven units over the bar's own three, so a box that stopped at
      // zero would cut the top off the bite.
      const crest = Math.min(...points(BITE).map(([, y]) => y));
      expect(crest).toBeLessThan(-5);
      expect(BITE_ABOVE).toContain('V-12H0Z');
    });
  });

  /*
   * The one copy that cannot import.
   *
   * `tailwind.panel.config.js` carries the bite inside a data URI, because a
   * mask is a stylesheet value and the config is CommonJS while this is a
   * module. Nothing stops the two drifting except this.
   */
  it('matches the outline the mask in the Tailwind config uses', () => {
    const config = readFileSync(
      join(__dirname, '..', '..', '..', '..', 'tailwind.panel.config.js'),
      'utf8',
    );

    expect(config).toContain(BITE_ABOVE);
  });
});
