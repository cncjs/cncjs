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
 *
 * What is left of `ok` is the brake rather than the metronome. A segment is
 * sized as though the machine were travelling at the feed rate it was given,
 * and during a run of direction changes it is not — so `MAX_IN_FLIGHT` caps
 * how far ahead the loop may get, and an acknowledgement is what lets it go
 * on. Without that cap the queue grows for as long as somebody keeps changing
 * their mind, and everything downstream pays for it.
 */

/**
 * Seconds of travel per segment.
 *
 * **Ten milliseconds, the floor the documentation gives — and the shortness
 * is the whole point.** How long a turn takes is `dt * N`: the length of one
 * segment times how many are queued ahead of it. Short segments keep that
 * product small; the measured lead below keeps N small. Both are needed — a
 * short segment queued fifteen deep is still a long wait.
 *
 * Measured the other way round, at 0.1s a segment, a turn was still not
 * visible after 900ms.
 */
export const SEGMENT_SECONDS = 0.01;

/**
 * The least lead worth holding, in seconds.
 *
 * **The queue is kept short on purpose, because a stop can only be as quick
 * as the queue is long.** `0x85` empties the planner, but everything already
 * queued ahead of it has to be paid for first, so a planner filled to its
 * fifteen blocks is a fifteen-block stop — about 150ms, which at a normal
 * feed is most of a centimetre of travel after the key came up.
 *
 * Thirty milliseconds is not measured from any particular computer: it is the
 * floor below which the lead stops covering the serial adapter itself, whose
 * latency timer defaults to 16ms on Windows. Going lower buys a stop that the
 * cable gives back.
 */
export const LEAD_FLOOR_SECONDS = 0.03;

/**
 * The most lead worth holding, in seconds.
 *
 * Past this the cure is worse than the disease. Eighty milliseconds costs
 * about 2mm of stopping distance at 1500 mm/min and 7mm at 5000, and a host
 * that cannot keep a 10ms timer inside 40ms of jitter has a problem that a
 * longer jog queue is not going to fix — it needs saying, not absorbing,
 * which is what the run-time warning does.
 */
export const LEAD_CEILING_SECONDS = 0.08;

/**
 * The lead to use until the clock has measured itself.
 *
 * **Stated, not measured — because the honest thing to do before you know is
 * to say so.** An earlier version timed a throwaway interval at startup and
 * used that, which read 16ms on one boot and 40ms on the next while the real
 * answer, once the server was actually moving a machine, was 24ms. A number
 * that wrong is worse than a constant, because it looks like a measurement.
 *
 * Fifty milliseconds is the middle of the range this clamps to, and it errs
 * in the safe direction: a lead larger than needed costs a predictable
 * fraction of a millimetre of stopping distance, stated on screen, while a
 * lead smaller than needed empties the planner mid-move and the machine slows
 * in the cut. It holds for about two seconds of jogging, which is the first
 * hold of a session.
 */
export const LEAD_START_SECONDS = 0.05;

/**
 * How much lead this host has earned, from its measured timer jitter.
 *
 * Twice the worst observed interval: one interval to cover the tick that is
 * late, and one so the machine is still moving while the late tick is being
 * served. Below the floor and above the ceiling it is clamped, and with no
 * measurement at all it is the floor — which is the right default, because an
 * unmeasured host is not known to be slow.
 */
export const leadSecondsFor = (worstTickSeconds) => {
  if (!(worstTickSeconds > 0)) {
    return LEAD_FLOOR_SECONDS;
  }

  return Math.min(LEAD_CEILING_SECONDS, Math.max(LEAD_FLOOR_SECONDS, worstTickSeconds * 2));
};

/**
 * How long it takes to stop, in seconds, not counting deceleration.
 *
 * Two things have to happen before the machine can even begin slowing down.
 * The lead already handed to the planner has to be paid for, and the segment
 * last sent has to be acknowledged — because `0x85` cannot empty the
 * firmware's receive buffer, so cancelling before that acknowledgement leaves
 * a segment behind that starts the machine up again.
 *
 * Deceleration is deliberately not included: it depends on the feed rate in
 * use and on `$120`–`$122`, both of which belong to whoever is driving, not
 * to the server. The caller adds `v² / 2a` to this.
 */
export const stopSeconds = ({ leadSeconds, ackSeconds = 0 }) => leadSeconds + ackSeconds;

/**
 * How many segments may be outstanding before a tick is skipped.
 *
 * **This is the brake on the whole loop, and it has to be tight.**
 *
 * A segment is sized by the time that passed, which assumes the machine is
 * travelling at the feed rate it was given. During a run of direction changes
 * it is not: every reversal means braking and accelerating, so the real
 * average is well below the nominal one and segments arrive faster than they
 * are consumed. Nothing else stops that backlog growing, and the backlog is
 * what everything downstream suffers from — a stop cannot send `0x85` until
 * the segments already sent have been answered, so a deep queue is a machine
 * that keeps moving after the key came up.
 *
 * Measured with this at eight: a stop with seven segments still outstanding,
 * and the machine travelling on after the release. An acknowledgement is the
 * firmware saying it took a line, so holding the count near zero paces the
 * loop by what the machine actually manages rather than by what it was asked
 * for. Two, not one: one leaves no slack at all for the round trip, and the
 * planner still has the lead to run on while a tick waits.
 */
export const MAX_IN_FLIGHT = 2;

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
 * **The segment is a length of travel, not a length per axis.** A diagonal
 * given `v * dt` on both axes travels `v * dt * √2`, and the machine holds
 * the *resultant* to the feed rate — so it takes √2 times as long to run as
 * the tick that produced it. Sending those faster than they run is a queue
 * that grows for as long as the key is held: measured, a held diagonal
 * travelled 1.45× its due distance and took 819ms to stop, against 288ms for
 * the same hold along one axis. Dividing by √(number of axes) keeps the angle
 * and makes the segment last exactly its own `dt`.
 *
 * `G21` is stated on the line: the distance is in millimetres whatever units
 * the machine happens to be in.
 */
export const jogSegmentLine = ({ dir, feedrate, settings, mpos, seconds = SEGMENT_SECONDS }) => {
  const axes = Object.keys(dir).filter((axis) => TRAVEL[axis] && dir[axis]);
  if (!axes.length || !(feedrate > 0)) {
    return null;
  }

  // Per axis, so that the resultant is one segment's worth of travel.
  let distance = segmentDistance(feedrate, seconds) / Math.sqrt(axes.length);
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
