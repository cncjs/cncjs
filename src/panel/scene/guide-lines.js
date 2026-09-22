import { FADE_CELLS, gridAlpha, gridStep } from './grid-lines';

/**
 * The datum lines through a picked point, and how far they are worth drawing.
 *
 * **They stop where the ground stops.** Running them to an arbitrary length
 * made them a thing lying near the point; bounded by the machine and faded
 * out the same way the grid is, they read as part of the floor — which is
 * what they are, a pair of rulers laid on it.
 *
 * The fade is the grid's own, down to the function: same margin, same
 * smoothstep, so the two arrive at nothing together instead of one out-living
 * the other by a few squares.
 *
 * Split into segments for the same reason the grid is. A material carries one
 * opacity for a whole draw call, so anything that fades along its length needs
 * vertices along its length to carry it.
 *
 * Named `guide-lines` rather than `guides` for the reason `grid-lines` is:
 * Windows cannot tell `./Guides` from `./guides`.
 */

// Enough that the fade reads as a gradient rather than as a run of steps, and
// few enough that rebuilding on every mouse move stays free.
const SEGMENTS = 24;

/** The extent the lines span: the area, plus the grid's own fade margin. */
export const guideSpan = (area) => {
  const step = gridStep(Math.max(
    area.max.x - area.min.x,
    area.max.y - area.min.y,
    1
  ));
  const margin = step * FADE_CELLS;

  return {
    margin,
    min: { x: area.min.x - margin, y: area.min.y - margin },
    max: { x: area.max.x + margin, y: area.max.y + margin },
  };
};

/**
 * Two lines crossing at `at`, in world coordinates.
 *
 * @returns {{positions: Float32Array, colors: Float32Array}} Ready to be
 *   written straight into a geometry's attributes — including the alpha, which
 *   is the fourth colour component.
 */
export const buildGuide = (at, area, z, rgb) => {
  const span = guideSpan(area);
  const positions = new Float32Array(SEGMENTS * 2 * 2 * 3);
  const colors = new Float32Array(SEGMENTS * 2 * 2 * 4);

  let p = 0;
  let c = 0;

  const vertex = (x, y) => {
    positions[p] = x;
    positions[p + 1] = y;
    positions[p + 2] = z;
    p += 3;
    colors[c] = rgb.r;
    colors[c + 1] = rgb.g;
    colors[c + 2] = rgb.b;
    colors[c + 3] = gridAlpha(x, y, area, span.margin);
    c += 4;
  };

  for (let i = 0; i < SEGMENTS; ++i) {
    const a = span.min.x + ((span.max.x - span.min.x) * i) / SEGMENTS;
    const b = span.min.x + ((span.max.x - span.min.x) * (i + 1)) / SEGMENTS;
    vertex(a, at.y);
    vertex(b, at.y);
  }
  for (let i = 0; i < SEGMENTS; ++i) {
    const a = span.min.y + ((span.max.y - span.min.y) * i) / SEGMENTS;
    const b = span.min.y + ((span.max.y - span.min.y) * (i + 1)) / SEGMENTS;
    vertex(at.x, a);
    vertex(at.x, b);
  }

  return { positions, colors };
};

export default buildGuide;
