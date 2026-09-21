import * as THREE from 'three';

/**
 * Where the ground's lines go, and how far out they are still worth drawing.
 *
 * Separate from the component that draws them, like the rest of this screen's
 * arithmetic — and separately from that, jest only transforms `.js` here, so a
 * `.jsx` file is a file with no unit tests. Named `grid-lines` rather than
 * `grid` because Windows would not tell `./grid` and `./Grid` apart.
 */

// Roughly how many squares to aim for across the longer side of the area
// itself. Below about ten the grid stops reading as a surface; much above
// twenty and it turns into a grey wash that competes with the path drawn on
// it.
const TARGET_DIVISIONS = 16;

// Millimetres a machinist would actually think in. The step is the first of
// these that keeps the count at or under the target, so the lines land on
// round numbers rather than on whatever the extent divided by sixteen was.
const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

/**
 * How far past the area the grid keeps going before it has faded to nothing.
 *
 * The ground does not stop where the machine's travel does, and a grid that
 * did read as a table the machine was standing on rather than as the floor
 * under both. Six squares is far enough to be clearly *past* the edge without
 * becoming most of what is on screen.
 */
export const FADE_CELLS = 6;

export const gridStep = (extent) => (
  STEPS.find((step) => (extent / step) <= TARGET_DIVISIONS) || STEPS[STEPS.length - 1]
);

const snapDown = (value, step) => Math.floor(value / step) * step;
const snapUp = (value, step) => Math.ceil(value / step) * step;

// Hermite, so the grid leaves the edge of the area and arrives at nothing
// with no seam at either end. A straight ramp shows both.
const smoothstep = (t) => (t * t * (3 - (2 * t)));

/**
 * How solid the grid is at a point: full inside the area, gone by the end of
 * the fade.
 *
 * Measured against the area as a rectangle rather than as a circle, so the
 * fade runs parallel to the machine's own edges instead of cutting its
 * corners off.
 */
export const gridAlpha = (x, y, area, margin) => {
  const beyondX = Math.max(0, area.min.x - x, x - area.max.x);
  const beyondY = Math.max(0, area.min.y - y, y - area.max.y);
  const t = Math.min(1, Math.max(beyondX, beyondY) / margin);

  return 1 - smoothstep(t);
};

const geometryOf = ({ points, alphas }, color) => {
  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

  /*
   * Four components, so the renderer reads an alpha as well as a colour.
   *
   * The fade has to live on the vertices. A material carries one opacity for
   * the whole draw call, which is exactly the hard edge this replaces: the
   * grid was fully there and then, at one line, entirely absent.
   */
  const rgba = new Float32Array(alphas.length * 4);
  for (let i = 0; i < alphas.length; ++i) {
    rgba[i * 4] = color.r;
    rgba[(i * 4) + 1] = color.g;
    rgba[(i * 4) + 2] = color.b;
    rgba[(i * 4) + 3] = alphas[i];
  }
  buffer.setAttribute('color', new THREE.BufferAttribute(rgba, 4));

  return buffer;
};

/**
 * Roughly how many numbers to put along an axis before they start colliding.
 *
 * Every grid line labelled is unreadable at any size the panel is actually
 * looked at; every other line, or every fourth, keeps the figures apart and
 * still lets the ones between be counted off the squares.
 */
const MAX_LABELS = 12;

/**
 * The numbers to write on the ground, and where.
 *
 * Only inside the area — out in the fade the grid is a hint that the floor
 * continues, and a number there would be a measurement of nothing. Laid half
 * a square outside the near edge so they sit beside the machine rather than
 * inside it, where the toolpath is.
 *
 * @returns {object[]} `{ key, text, x, y }` in machine coordinates.
 */
export const gridLabels = (area, step) => {
  const first = (min) => snapUp(min, step);
  const last = (max) => snapDown(max, step);

  const ticks = (min, max) => {
    const values = [];
    for (let v = first(min); v <= last(max); v += step) {
      values.push(v);
    }
    const every = Math.ceil(values.length / MAX_LABELS);
    return values.filter((_, i) => (i % every) === 0);
  };

  const gap = step / 2;
  const labels = [];

  for (const x of ticks(area.min.x, area.max.x)) {
    labels.push({ key: `x${x}`, text: String(x), x, y: area.min.y - gap });
  }
  for (const y of ticks(area.min.y, area.max.y)) {
    labels.push({ key: `y${y}`, text: String(y), x: area.min.x - gap, y });
  }

  // The unit, once per axis, past the end of the run of numbers. Every other
  // reading on this panel says `mm` beside it and this one should not be the
  // exception — but repeating it twenty times would be twenty times the ink
  // for one fact.
  labels.push({
    key: 'unit-x',
    text: 'mm',
    x: last(area.max.x) + step,
    y: area.min.y - gap,
  });
  labels.push({
    key: 'unit-y',
    text: 'mm',
    x: area.min.x - gap,
    y: last(area.max.y) + step,
  });

  return labels;
};

/**
 * @param {object} area What the grid is the ground for — the machine's travel
 *   where it is known. Squares are sized from this, and the fade starts at it.
 * @param {number} z The height to lay the grid at.
 * @param {string|number} color Anything `THREE.Color` accepts.
 * @returns {object} `{ lines, axes, step, margin }` — two geometries, because
 *   the lines through zero are drawn at a different weight from the rest.
 */
export const buildGrid = (area, z, color) => {
  const step = gridStep(Math.max(
    area.max.x - area.min.x,
    area.max.y - area.min.y,
    1
  ));

  const margin = step * FADE_CELLS;
  const minX = snapDown(area.min.x - margin, step);
  const maxX = snapUp(area.max.x + margin, step);
  const minY = snapDown(area.min.y - margin, step);
  const maxY = snapUp(area.max.y + margin, step);

  const xs = [];
  for (let x = minX; x <= maxX; x += step) {
    xs.push(x);
  }
  const ys = [];
  for (let y = minY; y <= maxY; y += step) {
    ys.push(y);
  }

  const line = { points: [], alphas: [] };
  const axis = { points: [], alphas: [] };

  // A line through zero is not one more grid line. It is where the machine
  // says everything is measured from, and on an unhomed machine it is the
  // only thing on screen that claims to be a position at all.
  const isZero = (value) => Math.abs(value) < step / 1000;

  /*
   * Each line is laid as one segment per square rather than as one long one.
   * A vertex is the only thing that can carry its own alpha, so a line that
   * fades along its length needs vertices along its length.
   */
  const add = (ax, ay, bx, by, zero) => {
    const into = zero ? axis : line;
    into.points.push(ax, ay, z, bx, by, z);
    into.alphas.push(gridAlpha(ax, ay, area, margin), gridAlpha(bx, by, area, margin));
  };

  for (const x of xs) {
    for (let i = 1; i < ys.length; ++i) {
      add(x, ys[i - 1], x, ys[i], isZero(x));
    }
  }
  for (const y of ys) {
    for (let i = 1; i < xs.length; ++i) {
      add(xs[i - 1], y, xs[i], y, isZero(y));
    }
  }

  const rgb = new THREE.Color(color);

  return {
    lines: geometryOf(line, rgb),
    axes: geometryOf(axis, rgb),
    step,
    margin,
  };
};

export default buildGrid;
