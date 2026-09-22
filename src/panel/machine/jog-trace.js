/**
 * A recording of what was asked for and what the machine did.
 *
 * Arguments about jogging keep coming down to the same disagreement: it felt
 * late, or it felt like the moves queued up. Neither is answerable from a
 * position readout, because the interesting part is the gap between three
 * things that are each visible separately and never together — the key going
 * down, the segment leaving for the machine, and the tool moving.
 *
 * So all three land on one clock here. Nothing in this file draws anything;
 * it keeps a window of events and the arithmetic for reading them back.
 */

/** How much history to keep, in milliseconds. */
export const WINDOW_MS = 12000;

/**
 * Drop everything older than the window.
 *
 * @param {Array} events Events with a `t` in milliseconds.
 * @param {number} now The present, on the same clock.
 */
export const withinWindow = (events, now, window = WINDOW_MS) =>
  events.filter((event) => now - event.t <= window);

/**
 * Turn key presses into bars.
 *
 * A press is a `down` and the `up` that follows it. A key still held has no
 * `up` yet and runs to the right-hand edge — which is the honest drawing,
 * because it is still being held.
 */
export const pressBars = (events, now) => {
  const bars = [];
  const open = new Map();

  for (const event of events) {
    if (event.kind !== 'key') {
      continue;
    }

    if (event.down) {
      open.set(event.key, event.t);
    } else if (open.has(event.key)) {
      bars.push({ key: event.key, from: open.get(event.key), to: event.t });
      open.delete(event.key);
    }
  }

  for (const [key, from] of open) {
    bars.push({ key, from, to: now, held: true });
  }

  return bars;
};

/**
 * How long the machine took to answer each press, in milliseconds.
 *
 * Measured to the first segment sent after the key went down, because that is
 * the moment the decision left this computer — everything after it belongs to
 * the firmware and the mechanics. Null where nothing was sent, which is the
 * case worth seeing: a press that produced no movement at all.
 */
export const responseTimes = (events) => {
  const answers = [];
  const held = new Set();
  let waiting = null;

  for (const event of events) {
    if (event.kind === 'segment') {
      if (waiting) {
        answers.push({ key: waiting.key, at: waiting.at, ms: event.t - waiting.at });
        waiting = null;
      }
      continue;
    }

    if (event.kind !== 'key') {
      continue;
    }

    if (event.down) {
      /*
       * Only a press from silence is a question. A second key added to one
       * already held makes a diagonal out of a move that is already running,
       * and the segments carrying it are indistinguishable from the ones
       * already flowing — so there is nothing honest to measure.
       */
      if (!held.size) {
        waiting = { key: event.key, at: event.t };
      }
      held.add(event.key);
      continue;
    }

    held.delete(event.key);

    // Released with nothing sent: the press produced no movement at all.
    if (waiting && !held.size) {
      answers.push({ key: waiting.key, at: waiting.at, ms: null });
      waiting = null;
    }
  }

  return answers;
};

/**
 * Distance travelled between the first and last position in the recording.
 *
 * Straight-line, over whichever axes moved. Used to answer "did it do more
 * than I asked for", which is what a queue would look like.
 */
export const travelled = (events) => {
  const positions = events.filter((event) => event.kind === 'position');

  if (positions.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 1; i < positions.length; i += 1) {
    const from = positions[i - 1];
    const to = positions[i];
    total += Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  }

  return total;
};

/**
 * Where an event sits across the drawing, as a fraction from 0 to 1.
 *
 * The right-hand edge is now and time runs backwards to the left, so a
 * recording reads the way a person watches one: the thing that just happened
 * is where the eye already is.
 */
export const placeAt = (t, now, window = WINDOW_MS) => {
  const fraction = 1 - ((now - t) / window);
  return Math.min(1, Math.max(0, fraction));
};

export default pressBars;
