import { hostTiming, observeJogTicks } from '../host-timing';
import { LEAD_CEILING_SECONDS, LEAD_FLOOR_SECONDS } from '../../controllers/Grbl/jog';

// The module holds one figure for the process, which is the point of it, so
// each test pushes enough samples to overwrite whatever the last one left.
const feed = (seconds, count = 2000) => observeJogTicks(Array(count).fill(seconds));

describe('what the host is worth as a jog clock', () => {
  test('is the safe floor until anything has been measured', () => {
    // An unmeasured host is not known to be fast.
    expect(hostTiming().leadSeconds).toBe(LEAD_FLOOR_SECONDS);
  });

  test('follows what the jog clock actually delivered', () => {
    /*
     * The startup measurement watches an idle process, and nobody jogs an
     * idle process: by the time a key is held there may be a panel with a 3D
     * view on the same computer, or there may be nothing but this server on a
     * mini PC. The ticks of a real jog are the only sample that knows which.
     */
    feed(0.025);
    expect(hostTiming().leadSeconds).toBeCloseTo(0.05, 9);
    expect(hostTiming().tick.from).toBe('jogging');
  });

  test('a quiet host earns a shorter lead, and so a shorter stop', () => {
    feed(0.011);
    // Twice 11ms is under the floor, so the floor stands.
    expect(hostTiming().leadSeconds).toBe(LEAD_FLOOR_SECONDS);
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
