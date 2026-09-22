import logger from './logger';
import { measureTicks, summarise } from './tick-jitter';
import { SEGMENT_SECONDS, leadSecondsFor } from '../controllers/Grbl/jog';

const log = logger('service:host-timing');

/**
 * What this computer is worth as a jog clock, measured once at startup.
 *
 * Held for the process rather than per controller: it describes the host, not
 * the machine, and measuring it again for a second serial port would give the
 * same answer while stealing two seconds of a busy event loop.
 *
 * Before the measurement finishes — and if it never runs, as in tests — the
 * floor stands. An unmeasured host is not known to be slow, and the floor is
 * the value that was safe on every machine this has run on.
 *
 * **The startup figure is a starting point, not the answer.** It measures an
 * idle process, and nobody jogs an idle process. The two installations this
 * has to serve are not alike: everything on one laptop, where the panel's 3D
 * view shares an event loop with the jog clock, or a mini PC running nothing
 * but this server with the panel on somebody else's computer. Nobody is
 * going to restart a server to find out which they have.
 *
 * So the real measurement comes from the jog clock itself — it ticks in
 * exactly the conditions that matter, and every tick is a sample.
 * `observeJogTicks` feeds them back, and once there are enough they replace
 * the startup guess.
 *
 * What never moves is the lead *within* a jog: it is read when a key goes
 * down and holds until the key comes up, so the distance travelled after a
 * release is the same every release. The figure changes only between jogs,
 * and when it changes the panel is told — so what is on screen is what is in
 * force.
 */
let measured = null;

/** Ticks per series — a second of watching, at 10ms a tick. */
const SAMPLES = 100;

/**
 * How many times to measure.
 *
 * **One measurement is a lottery, not a calibration.** Run on this laptop it
 * came back 18ms, then 20ms, then 25ms — the spread is whatever else the
 * computer was doing during that one second, not the computer. Taking the
 * middle of three series throws away both the run that caught a busy moment
 * and the run that caught an idle one, which is what makes the figure the
 * same from one restart to the next — and an operator who is told a stopping
 * distance should get the same one tomorrow.
 *
 * A host that is *always* busy still gets caught, by the warning the jog
 * clock logs when a tick overruns the lead it was given.
 */
const SERIES = 3;

/**
 * How long to let the process settle before measuring it.
 *
 * A server's first seconds are its least typical: modules loading, the web
 * app being assembled, controllers starting. Measured there, this host came
 * out at 18ms one run and 20ms the next — the variation is the startup, not
 * the computer. Waiting costs nothing, because the conservative floor is in
 * use until the measurement lands and nobody is jogging three seconds into a
 * server's life.
 */
const SETTLE_MS = 3000;

/** Ticks seen while actually jogging, newest last. */
let observed = [];

/** Enough real ticks to be worth more than the startup measurement. */
const ENOUGH_OBSERVED = 200;

/**
 * How many to keep.
 *
 * Two thousand ticks is about twenty seconds of jogging, so the figure
 * follows the computer as it is now — a laptop that has since had a browser
 * opened on it, a mini PC that has since finished doing something else.
 */
const KEEP_OBSERVED = 2000;

const current = () => {
  if (observed.length >= ENOUGH_OBSERVED) {
    return { ...summarise(observed), from: 'jogging' };
  }

  return measured ? { ...measured, from: 'startup' } : null;
};

export const hostTiming = () => {
  const tick = current();

  return {
    tick,
    leadSeconds: leadSecondsFor(tick?.worst),
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
};

/**
 * Measure the host, and say what it means in plain terms.
 *
 * The log line is the point, not a side effect. Whoever installs this on a
 * mini PC in a workshop gets one line at startup telling them what their
 * hardware bought them, in the units they care about — milliseconds of delay
 * after letting go of a key.
 */
export const calibrateHost = async () => {
  await new Promise((resolve) => { setTimeout(resolve, SETTLE_MS); });

  const runs = [];
  for (let i = 0; i < SERIES; i += 1) {
    // Sequential on purpose: three timers at once would measure each other.
    // eslint-disable-next-line no-await-in-loop
    runs.push(await measureTicks({ every: SEGMENT_SECONDS * 1000, samples: SAMPLES }));
  }

  const middle = (pick) => [...runs].map(pick).sort((a, b) => a - b)[Math.floor(SERIES / 2)];

  measured = {
    median: middle((run) => run.median),
    worst: middle((run) => run.worst),
    max: Math.max(...runs.map((run) => run.max)),
    samples: runs.reduce((total, run) => total + run.samples, 0),
  };

  const { leadSeconds } = hostTiming();
  log.info(
    `Jog clock calibrated for this host: timer asked for ${SEGMENT_SECONDS * 1000}ms, ` +
    `delivered ${Math.round(measured.median * 1000)}ms typical, ` +
    `${Math.round(measured.worst * 1000)}ms at the 99th percentile ` +
    `(worst seen ${Math.round(measured.max * 1000)}ms). ` +
    `Jog lead ${Math.round(leadSeconds * 1000)}ms, so a jog stops about ` +
    `${Math.round(leadSeconds * 1000)}ms after the key is released, plus the ` +
    'machine\'s own deceleration.'
  );

  return hostTiming();
};

export default hostTiming;
