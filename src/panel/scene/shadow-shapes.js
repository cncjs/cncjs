/**
 * The closed outlines in a toolpath, seen from above.
 *
 * A shadow drawn as lines alone is a tangle of hairlines; the eye reads a
 * filled patch as an object on the table and a scribble as noise. So wherever
 * the cutting path comes back to where it started, that loop is a face worth
 * shading — a pocket, a profile, a bored hole. Everything that never closes
 * stays a line.
 *
 * **Loops are found by following the path, not by geometry.** Consecutive cut
 * segments share endpoints, so walking them in order and watching for the run
 * to return to its own start is both cheap and exactly what a closed contour
 * in G-code is. Anything cleverer — plane sweeps, winding rules — would be
 * solving a harder problem than "did the tool come back".
 *
 * Z is dropped: this is the plan, and the shadow is flat by definition.
 */

// How near counts as back where it started, in millimetres. Controllers
// report three decimals, and arcs are emitted as chords that land a hair off
// the exact point they were computed from.
const CLOSED = 1e-3;

// Below this a "loop" is a rounding artefact rather than an area.
const MIN_POINTS = 3;
const MIN_SPAN = 0.05;

/**
 * An upper bound on how many faces are worth building.
 *
 * A roughing program can close a loop per pass per step-down, which is
 * thousands of faces for one visual idea. The shadow is a hint about where
 * the work is, so it can stop long before it becomes the most expensive thing
 * on screen.
 */
const MAX_LOOPS = 400;

const near = (ax, ay, bx, by) => Math.abs(ax - bx) <= CLOSED && Math.abs(ay - by) <= CLOSED;

const spans = (points) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return Math.max(maxX - minX, maxY - minY);
};

/**
 * @param {ArrayLike<number>} positions Line-segment pairs, flat, `xyzxyz`.
 * @returns {number[][][]} One array of `[x, y]` per closed loop.
 */
export const closedLoops = (positions) => {
  const loops = [];
  let run = null;

  const finish = () => {
    if (run && run.length >= MIN_POINTS && spans(run) >= MIN_SPAN) {
      loops.push(run);
    }
    run = null;
  };

  for (let i = 0; i + 5 < positions.length && loops.length < MAX_LOOPS; i += 6) {
    const ax = positions[i];
    const ay = positions[i + 1];
    const bx = positions[i + 3];
    const by = positions[i + 4];

    if (!run) {
      run = [[ax, ay]];
    } else {
      const [lastX, lastY] = run[run.length - 1];
      if (!near(lastX, lastY, ax, ay)) {
        // The path jumped: whatever was being traced is not a loop.
        finish();
        run = [[ax, ay]];
      }
    }

    run.push([bx, by]);

    const [startX, startY] = run[0];
    if (run.length > MIN_POINTS && near(bx, by, startX, startY)) {
      finish();
    }
  }

  return loops;
};

export default closedLoops;
