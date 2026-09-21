import * as THREE from 'three';

/**
 * Where the ground's lines go.
 *
 * Separate from the component that draws them, like the rest of this screen's
 * arithmetic — and separately from that, jest only transforms `.js` here, so a
 * `.jsx` file is a file with no unit tests. Named `grid-lines` rather than
 * `grid` because Windows would not tell `./grid` and `./Grid` apart.
 */

// Roughly how many squares to aim for across the longer side. Below about ten
// the grid stops reading as a surface; much above twenty and it turns into a
// grey wash that competes with the path drawn on it.
const TARGET_DIVISIONS = 16;

// Millimetres a machinist would actually think in. The step is the first of
// these that keeps the count at or under the target, so the lines land on
// round numbers rather than on whatever the extent divided by sixteen was.
const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

export const gridStep = (extent) => (
  STEPS.find((step) => (extent / step) <= TARGET_DIVISIONS) || STEPS[STEPS.length - 1]
);

const snapDown = (value, step) => Math.floor(value / step) * step;
const snapUp = (value, step) => Math.ceil(value / step) * step;

const geometryOf = (points) => {
  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return buffer;
};

/**
 * @param {object} bounds What is being drawn, in machine coordinates.
 * @param {number} z The height to lay the grid at.
 * @returns {object} `{ lines, axes, step }` — two geometries, because the
 *   lines through zero are drawn at a different weight from the rest.
 */
export const buildGrid = (bounds, z) => {
  const step = gridStep(Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    1
  ));

  const minX = snapDown(bounds.min.x, step);
  const maxX = snapUp(bounds.max.x, step);
  const minY = snapDown(bounds.min.y, step);
  const maxY = snapUp(bounds.max.y, step);

  const lines = [];
  const axes = [];

  // A line through zero is not one more grid line. It is where the machine
  // says everything is measured from, and on an unhomed machine it is the
  // only thing on screen that claims to be a position at all.
  const into = (value) => ((Math.abs(value) < step / 1000) ? axes : lines);

  // Compared exactly, and that is safe rather than lucky: every step is a
  // whole number of millimetres and both ends were snapped to a multiple of
  // it, so the counter walks integers and lands on the end. A tolerance was
  // written here first, for accumulated error that cannot happen — and the
  // test written to justify it could not fail.
  for (let x = minX; x <= maxX; x += step) {
    into(x).push(x, minY, z, x, maxY, z);
  }
  for (let y = minY; y <= maxY; y += step) {
    into(y).push(minX, y, z, maxX, y, z);
  }

  return { lines: geometryOf(lines), axes: geometryOf(axes), step };
};

export default buildGrid;
