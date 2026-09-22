import { STEPS, fineStep, snapDown, snapUp } from './grid-lines';

/**
 * The numbers written on the ground, and how densely.
 *
 * Split out of `grid-lines` when that file passed its line limit, and split
 * here because this is where the seam already was: everything in the other
 * file is geometry the renderer consumes, and everything here is a decision
 * about what to *say* — which round number to count in, where to put it, and
 * which one is worth keeping when two collide.
 *
 * Named `grid-numbers` and not `grid-labels`, because `GridLabels.jsx` sits
 * beside it and Windows would not tell the two apart. See `pointer-plane.js`
 * for the time that cost an afternoon.
 */

/**
 * How far apart the numbers have to be on screen before they stop colliding.
 *
 * Measured against the widest figure the grid produces — four digits, which
 * at the label size is about 45px — plus enough air that two of them read as
 * two readings rather than as one long number.
 *
 * 90 was too cautious: on a metre of travel it skipped straight from 200 to
 * 500 while there was comfortably room for 250, and a grid counted in
 * five-hundreds leaves the eye doing arithmetic.
 */
const LABEL_SPACING_PIXELS = 64;

/**
 * Which round number to count in, at this zoom.
 *
 * **The numbers thin out rather than shrink.** Holding a figure at a legible
 * size while the view pulls back writes them over each other; dropping every
 * other one keeps both the size and the spacing, and the squares between two
 * labels can still be counted off. So the ladder runs the other way as the
 * view closes in — 200, then 100, 50, 20, 10 — and every rung is a number a
 * machinist already thinks in, because they come from the same table the grid
 * itself is spaced from.
 *
 * Never finer than the lines there are to point at — which, once the view is
 * close enough for the sub-grid to be drawn, means the sub-grid rather than
 * the coarse one. A number against empty floor points at nothing.
 *
 * @param {number} step The grid's own square, in millimetres.
 * @param {number} zoom Pixels per millimetre — for an orthographic camera
 *   that is exactly what `camera.zoom` is.
 */
export const labelStep = (step, zoom) => {
  if (!(zoom > 0)) {
    return step;
  }

  const floor = fineStep(step) || step;
  const wide = STEPS.find(
    (candidate) => candidate >= floor && candidate * zoom >= LABEL_SPACING_PIXELS
  );

  return wide || Math.max(floor, STEPS[STEPS.length - 1]);
};

/**
 * A backstop on how many numbers may be built, whatever the zoom asks for.
 *
 * `labelStep` already spaces them, so this only bites when the view is closed
 * right in on a large machine and the spacing would call for a figure every
 * ten millimetres across a metre of travel. Each label is a painted canvas
 * and a texture; a hundred of them per axis is memory spent on numbers that
 * are mostly off screen.
 */
const MAX_LABELS = 40;

/**
 * The numbers to write on the ground, and where.
 *
 * Only inside the area — out in the fade the grid is a hint that the floor
 * continues, and a number there would be a measurement of nothing.
 *
 * **Laid along the machine's own zero lines**, not along the edge of the
 * travel. Those two lines are already drawn heavier than the rest of the grid
 * — they are where the machine measures everything from — so the figures
 * belong against them, and both rows then share one origin instead of
 * starting from opposite corners of the drawing.
 *
 * A machine whose travel does not contain zero gets the nearest edge instead,
 * which is the same line as far as the reading goes.
 *
 * **Placed on the line itself, with an offset the caller applies in pixels.**
 * How far off cannot be decided here: it has to be a fixed distance on
 * screen, or the figures drift as the spacing coarsens — which is what
 * happened when the offsets were fractions of a label step. Both drifted:
 * the numbers away from their axis, and `mm` along it, further out with every
 * coarsening.
 *
 * @returns {object[]} `{ key, text, x, y, push }` in machine coordinates,
 *   where `push` is in multiples of the caller's gap — out of the machine,
 *   and for the unit, along the axis past the last figure.
 */
export const gridLabels = (area, step) => {
  const first = (min) => snapUp(min, step);
  const last = (max) => snapDown(max, step);

  /*
   * **The far end of the travel is always named.**
   *
   * Counting in round numbers from zero leaves the end of the axis unlabelled
   * whenever the range is not a multiple of the step: 700mm counted in
   * five-hundreds stops at -500, and the one figure an operator most wants —
   * how far the machine actually goes — is the one missing. So the extreme is
   * added whatever the step is.
   *
   * Its neighbour is dropped only if the two would collide: closer than about
   * a third of a square is two figures sharing a space, and the extreme is
   * the one worth keeping.
   */
  const CROWDED = 0.4;

  const ticks = (min, max, far) => {
    const values = [];
    for (let v = first(min); v <= last(max); v += step) {
      values.push(v);
    }

    const every = Math.ceil(values.length / MAX_LABELS);
    const kept = values.filter((_, i) => (i % every) === 0);

    if (Number.isFinite(far) && !kept.includes(far)) {
      const span = step * every * CROWDED;
      const clear = kept.filter((v) => Math.abs(v - far) >= span);
      return far < kept[0] ? [far, ...clear] : [...clear, far];
    }

    return kept;
  };

  // Which end of each axis is the far one — the reach, rather than the datum.
  const farX = Math.abs(area.min.x) > Math.abs(area.max.x) ? area.min.x : area.max.x;
  const farY = Math.abs(area.min.y) > Math.abs(area.max.y) ? area.min.y : area.max.y;

  const labels = [];

  // Where the zero lines are, and which way is away from the work.
  const axisY = Math.min(Math.max(0, area.min.y), area.max.y);
  const axisX = Math.min(Math.max(0, area.min.x), area.max.x);
  const outY = axisY > (area.min.y + area.max.y) / 2 ? 1 : -1;
  const outX = axisX > (area.min.x + area.max.x) / 2 ? 1 : -1;

  /*
   * **The origin is written once, for both rulers.**
   *
   * Each row would otherwise print its own zero, and on a machine that homes
   * to the maximum both land on the same corner — two figures reading `0` a
   * few pixels apart, which looks like a rendering fault rather than like two
   * axes meeting. The shared one is pushed out along the diagonal, away from
   * both rows at once.
   */
  const shared = (value, axis) => value === axis;

  for (const x of ticks(area.min.x, area.max.x, farX)) {
    if (!shared(x, axisX)) {
      labels.push({ key: `x${x}`, text: String(x), x, y: axisY, push: { x: 0, y: outY } });
    }
  }
  for (const y of ticks(area.min.y, area.max.y, farY)) {
    if (!shared(y, axisY)) {
      labels.push({ key: `y${y}`, text: String(y), x: axisX, y, push: { x: outX, y: 0 } });
    }
  }

  labels.push({
    key: 'origin',
    text: String(axisX),
    x: axisX,
    y: axisY,
    push: { x: outX * 0.85, y: outY * 0.85 },
  });

  // The unit, once per axis, past the end of the run of numbers. Every other
  // reading on this panel says `mm` beside it and this one should not be the
  // exception — but repeating it twenty times would be twenty times the ink
  // for one fact.
  /*
   * The unit, once, in the X row just past the shared zero.
   *
   * Out on the diagonal it read as detached — a word floating off the corner
   * of the drawing with nothing to belong to. In line with the figures it is
   * plainly the unit for them: same offset off the axis, one place further
   * along it, exactly where the next number would have gone.
   */
  labels.push({
    key: 'unit',
    text: 'mm',
    x: axisX,
    y: axisY,
    push: { x: outX * 1.7, y: outY },
  });

  return labels;
};
