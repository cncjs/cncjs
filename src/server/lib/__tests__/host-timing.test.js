import { hostTiming, observeJogTicks } from '../host-timing';
import {
  LEAD_CEILING_SECONDS, LEAD_FLOOR_SECONDS, LEAD_START_SECONDS,
} from '../../controllers/Grbl/jog';

// The module holds one figure for the process, which is the point of it, so
// each test pushes enough samples to overwrite whatever the last one left.
const feed = (seconds, count = 2000) => observeJogTicks(Array(count).fill(seconds));

describe('before the clock has measured itself', () => {
  test('uses a stated value rather than a number dressed up as a measurement', () => {
    /*
     * The version this replaced timed a throwaway interval at startup: it
     * read 16ms on one boot and 40ms on the next, while the same server
     * needed 24ms once it was actually moving a machine. A constant that
     * says it is a constant beats a measurement of the wrong thing.
     */
    expect(hostTiming().leadSeconds).toBe(LEAD_START_SECONDS);
    expect(hostTiming().tick).toBeNull();
  });

  test('the stated value errs towards a longer stop, not a rougher move', () => {
    /*
     * The two mistakes do not cost the same. Too much lead is a predictable
     * fraction of a millimetre, shown on screen; too little empties the
     * planner mid-move and the machine slows in the cut.
     */
    expect(LEAD_START_SECONDS).toBeGreaterThan(LEAD_FLOOR_SECONDS);
    expect(LEAD_START_SECONDS).toBeLessThan(LEAD_CEILING_SECONDS);
  });
});

describe('once it has jogged', () => {
  test('a hundred real ticks is enough to stop guessing', () => {
    // One decent hold — a couple of seconds of moving.
    feed(0.025, 99);
    expect(hostTiming().tick).toBeNull();

    feed(0.025, 1);
    expect(hostTiming().tick).not.toBeNull();
  });

  test('follows what the jog clock actually delivered', () => {
    feed(0.025);
    expect(hostTiming().leadSeconds).toBeCloseTo(0.05, 9);
  });

  test('a quiet host earns a shorter lead, and so a shorter stop', () => {
    feed(0.011);
    // Twice 11ms is under the floor, so the floor stands — and the floor is
    // shorter than the value used before anything was known.
    expect(hostTiming().leadSeconds).toBe(LEAD_FLOOR_SECONDS);
    expect(hostTiming().leadSeconds).toBeLessThan(LEAD_START_SECONDS);
  });

  test('a struggling host is capped rather than followed off a cliff', () => {
    feed(0.2);
    expect(hostTiming().leadSeconds).toBe(LEAD_CEILING_SECONDS);
  });

  test('forgets what the computer used to be like', () => {
    /*
     * A laptop that has since been plugged in, or a host that has since
     * finished doing something else. Only the recent past counts.
     */
    feed(0.05);
    expect(hostTiming().leadSeconds).toBe(LEAD_CEILING_SECONDS);

    feed(0.02);
    expect(hostTiming().leadSeconds).toBeCloseTo(0.04, 9);
  });

  test('ignores a handful of ticks, which is noise rather than a measurement', () => {
    feed(0.02);
    const before = hostTiming().leadSeconds;

    // One unlucky tick during a short jog must not move the figure.
    observeJogTicks([0.5]);
    expect(hostTiming().leadSeconds).toBe(before);
  });

  test('takes nothing from an empty or nonsense reading', () => {
    feed(0.02);
    const before = hostTiming().leadSeconds;

    observeJogTicks([]);
    observeJogTicks(undefined);
    observeJogTicks([NaN, -1, 0]);

    expect(hostTiming().leadSeconds).toBe(before);
  });
});
