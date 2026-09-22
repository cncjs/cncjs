/**
 * How far the machine travels after a jog key is released.
 *
 * The one number an operator has to be able to predict before they put their
 * hand near a spindle, and it is not knowable from the firmware alone. It has
 * three parts and they come from three different places:
 *
 *   - the **lead** the server keeps in the planner, which depends on how
 *     punctual the host computer's timers are and is measured at startup;
 *   - the **reply** time of the firmware over its cable, measured while
 *     running, because a cancel cannot take effect until the last segment
 *     sent has been acknowledged;
 *   - the machine's own **deceleration**, which is `$120`–`$122` and the feed
 *     rate in use.
 *
 * The first two are the server's, arrive together as milliseconds, and are
 * the same whatever anybody is doing. The third is the panel's, because only
 * the panel knows which feed rate is set on which axis group.
 */

// `$120`/`$121`/`$122` — acceleration, mm/sec².
const ACCELERATION = { x: '$120', y: '$121', z: '$122' };

const setting = (settings, name) => {
  const value = Number.parseFloat(settings?.settings?.[name]);
  return Number.isFinite(value) ? value : null;
};

/**
 * The acceleration that governs a move, in mm/sec².
 *
 * The slowest of the axes involved, because a diagonal stops no faster than
 * its most sluggish part. Null when the machine has not said, in which case
 * there is no honest figure to give.
 */
export const accelerationFor = (axes, settings) => {
  const rates = axes
    .map((axis) => setting(settings, ACCELERATION[axis]))
    .filter((rate) => rate !== null && rate > 0);

  return rates.length ? Math.min(...rates) : null;
};

/**
 * How far the machine goes after the key comes up, in millimetres.
 *
 * `v * t + v² / 2a` — the travel still queued, then the distance spent
 * slowing down. Null when either half is unknown, because half of this
 * number is worse than none of it: it would read as a safety margin that has
 * not been measured.
 *
 * @param {object} timing `{ stopMs }` as measured by the server.
 * @param {number} feedrate mm/min, as set on the panel.
 * @param {number} acceleration mm/sec², from the firmware.
 */
export const stoppingDistance = ({ timing, feedrate, acceleration }) => {
  const stopMs = Number(timing?.stopMs);

  if (!Number.isFinite(stopMs) || !(feedrate > 0) || !(acceleration > 0)) {
    return null;
  }

  const speed = feedrate / 60;

  return (speed * (stopMs / 1000)) + ((speed * speed) / (2 * acceleration));
};

export default stoppingDistance;
