import logger from './logger';
import { summarise } from './tick-jitter';
import { LEAD_START_SECONDS, leadSecondsFor } from '../controllers/Grbl/jog';

const log = logger('service:host-timing');

/**
 * What this computer is worth as a jog clock, measured while it jogs.
 *
 * Continuous jogging is a clock: a segment of travel is handed to the machine
 * every `dt`, and the planner holds a small lead so a late tick does not
 * empty it mid-move. How large that lead has to be is not a property of the
 * machine or of Grbl — it is a property of **the computer the server happens
 * to be running on**, and the two installations this has to serve are not
 * alike. Everything on one laptop, where the panel's 3D view shares an event
 * loop with the jog clock, or a mini PC running nothing but this server with
 * the panel on somebody else's computer.
 *
 * **Measured, and measured while jogging.** An earlier version timed a
 * throwaway interval at startup, which was worse than useless: it watched an
 * idle process during the least typical seconds of its life. On this laptop
 * it read 16ms one boot and 40ms the next, against the 24ms the same server
 * turned out to need once it was actually moving a machine. Nobody is going
 * to restart a server to find out what their hardware is worth, so the only
 * honest sample is the jog clock itself — it ticks in exactly the conditions
 * that matter, and every tick is one measurement.
 *
 * Until enough of those exist, `LEAD_START_SECONDS` stands: one stated,
 * conservative value rather than a number dressed up as a measurement.
 *
 * What never moves is the lead *within* a jog. It is read when a key goes
 * down and holds until the key comes up, so the distance travelled after a
 * release is the same every release. The figure changes only between jogs,
 * and when it changes the panel is told — so what is on screen is what is in
 * force.
 */

/** Ticks seen while actually jogging, newest last. */
let observed = [];

/** Whether the first real measurement has been announced. */
let announced = false;

/**
 * Enough real ticks to stop using the starting value.
 *
 * A hundred is one decent hold — a couple of seconds of moving — and it is
 * also the fewest that makes a 99th percentile mean anything, since below
 * that it degenerates into the maximum.
 */
const ENOUGH_OBSERVED = 100;

/**
 * How many to keep.
 *
 * Two thousand ticks is about twenty seconds of jogging, so the figure
 * follows the computer as it is now — a laptop that has since had a browser
 * opened on it, a mini PC that has since finished doing something else.
 */
const KEEP_OBSERVED = 2000;

const measured = () => (observed.length >= ENOUGH_OBSERVED ? summarise(observed) : null);

export const hostTiming = () => {
  const tick = measured();

  return {
    tick,
    leadSeconds: tick ? leadSecondsFor(tick.worst) : LEAD_START_SECONDS,
  };
};

/**
 * Take note of how late the jog clock actually ran.
 *
 * Given one jog's worth of intervals, in seconds, once that jog is over —
 * never during it, because a lead that changed mid-move would change the
 * stopping distance mid-move.
 */
export const observeJogTicks = (intervals) => {
  const usable = (intervals ?? []).filter((n) => Number.isFinite(n) && n > 0);

  if (!usable.length) {
    return;
  }

  observed = [...observed, ...usable].slice(-KEEP_OBSERVED);

  const tick = measured();

  // Said once, when the guess is replaced by a measurement. Whoever installed
  // this on a mini PC in a workshop gets one line telling them what their
  // hardware is worth, in the units they care about.
  if (tick && !announced) {
    announced = true;
    const { leadSeconds } = hostTiming();
    log.info(
      'Jog clock measured on this host: ticks arrived ' +
      `${Math.round(tick.median * 1000)}ms apart typically, ` +
      `${Math.round(tick.worst * 1000)}ms at the 99th percentile. ` +
      `Jog lead ${Math.round(leadSeconds * 1000)}ms, so a jog stops about ` +
      `${Math.round(leadSeconds * 1000)}ms after the key is released, plus the ` +
      "machine's own deceleration."
    );
  }
};

export default hostTiming;
