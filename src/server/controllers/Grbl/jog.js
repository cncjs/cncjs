/**
 * Continuous jogging, the way Grbl's own documentation describes it.
 *
 * @see https://github.com/gnea/grbl/blob/master/doc/markdown/jogging.md
 *
 * The method there: send short incremental `$J=` segments at the rate the
 * machine consumes them, one every `dt`. It belongs on this side of the
 * socket rather than in a browser, because the rhythm has to survive a
 * stalled tab and a slow network, and because only the side holding the port
 * can see what the firmware has acknowledged.
 *
 * Universal Gcode Sender's `ContinuousJogWorker` uses the same `dt`. Two
 * alternatives were tried here first and both are worse. Holding the queue
 * short by watching free planner blocks in `Bf:` depends on a reading that
 * arrives with a status report and is already stale. Running purely on `ok`
 * is simpler and moves beautifully, but it fills the planner every time, and
 * a full planner is a slow stop — which is the defect UGS carries as #1494.
 */

/**
 * Seconds of travel per segment.
 *
 * **Ten milliseconds, the floor the documentation gives — and the shortness
 * is the whole point.** How long a turn takes is `dt * N`: the length of one
 * segment times how many are queued ahead of it. Short segments keep that
 * product small; `LEAD_SEGMENTS` below keeps N small. Both are needed — a
 * short segment queued fifteen deep is still a long wait.
 *
 * Measured the other way round, at 0.1s a segment, a turn was still not
 * visible after 900ms.
 */
export const SEGMENT_SECONDS = 0.01;

/**
 * How many segments to send before the clock takes over.
 *
 * **The queue is kept short on purpose, because a stop can only be as quick
 * as the queue is long.** `0x85` empties the planner, but everything already
 * queued ahead of it has to be paid for first, so a planner filled to its
 * fifteen blocks is a fifteen-block stop — about 150ms, which at a normal
 * feed is most of a centimetre of travel after the key came up.
 *
 * Running the loop on `ok` alone fills the planner to the brim every time:
 * Grbl answers as soon as it has *parsed* a line, not when it has *moved*,
 * so the loop always runs ahead until the planner is full. The clock below
 * is what stops that. These three are the cushion against a late tick —
 * three segments is 30ms of travel in hand, comfortably more than the jitter
 * measured on this loop (8–13ms) and still short enough to stop inside a
 * couple of millimetres.
 */
export const LEAD_SEGMENTS = 3;

/**
 * The most that may be outstanding before a tick is skipped.
 *
 * Only a backstop. If the firmware stops keeping up — a full planner, a busy
 * port — the unacknowledged lines pile up, and sending more would build a
 * backlog that a change of direction then has to wait behind. Skipping a tick
 * lets it catch up and costs nothing, because the planner still has the lead
 * above to run on.
 */
export const MAX_IN_FLIGHT = 8;

/**
 * How far a segment travels, in millimetres. `s = v * dt`.
 *
 * **The time is passed in, not assumed.** `setInterval` is not a metronome —
 * asked for 10ms it delivers about 15 on Windows — and a loop that sends a
 * 10ms segment every 15ms commands two thirds of the feed rate the operator
 * asked for. Measured: a 1500 mm/min jog held for 1.2s travelled 20mm instead
 * of 30. Sizing each segment by the time that actually passed makes the feed
 * rate right however late the tick was, and turns jitter into a slightly
 * longer segment rather than a slower machine.
 */
export const segmentDistance = (feedrate, seconds = SEGMENT_SECONDS) => (feedrate / 60) * seconds;

// `$130`/`$131`/`$132` — how far each axis can travel.
const TRAVEL = { x: '$130', y: '$131', z: '$132' };
// `$23` — the homing direction mask, which decides which side of zero the
// machine lives on. One bit per axis, in X, Y, Z order.
const INVERT_MASK = '$23';
const INVERT_BIT = { x: 1, y: 2, z: 4 };

const setting = (settings, name) => {
  const value = Number.parseFloat(settings?.[name]);
  return Number.isFinite(value) ? value : null;
};

/**
 * How far an axis can still go in one direction, in millimetres.
 *
 * Null when the machine has not said how far it travels, or has not reported
 * where it is — in which case there is no boundary to measure against and the
 * caller sends the segment as asked.
 *
 * Grbl homes to the maximum by default and puts zero there, so the reachable
 * volume is negative: `[-$130, 0]`. A set bit in `$23` flips that axis.
 */
export const roomFor = (axis, sign, settings, mpos) => {
  const travel = setting(settings, TRAVEL[axis]);
  const at = Number.parseFloat(mpos?.[axis]);

  if (travel === null || travel <= 0 || !Number.isFinite(at)) {
    return null;
  }

  const mask = setting(settings, INVERT_MASK) || 0;
  const homesToMinimum = (mask & INVERT_BIT[axis]) !== 0;
  const min = homesToMinimum ? 0 : -travel;
  const max = homesToMinimum ? travel : 0;

  return sign > 0 ? max - at : at - min;
};

/**
 * The `$J=` line for one segment, or null when there is nowhere left to go.
 *
 * Every axis gets the same distance, so a diagonal stays at 45° — the shorter
 * room wins, because bending the move when the nearer axis ran out would send
 * the tool somewhere other than where it was aimed.
 *
 * `G21` is stated on the line: the distance is in millimetres whatever units
 * the machine happens to be in.
 */
export const jogSegmentLine = ({ dir, feedrate, settings, mpos, seconds = SEGMENT_SECONDS }) => {
  const axes = Object.keys(dir).filter((axis) => TRAVEL[axis] && dir[axis]);
  if (!axes.length || !(feedrate > 0)) {
    return null;
  }

  let distance = segmentDistance(feedrate, seconds);
  for (const axis of axes) {
    const room = roomFor(axis, Math.sign(dir[axis]), settings, mpos);
    if (room !== null) {
      distance = Math.min(distance, Math.max(0, room));
    }
  }

  if (!(distance > 0)) {
    return null;
  }

  const words = ['x', 'y', 'z']
    .filter((axis) => axes.includes(axis))
    .map((axis) => `${axis.toUpperCase()}${Math.sign(dir[axis]) * distance}`)
    .join(' ');

  return `$J=G91 G21 ${words} F${feedrate}`;
};
