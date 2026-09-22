import { measureTicks, summarise } from '../tick-jitter';

describe('summarising measured intervals', () => {
  test('reports the typical and the near-worst separately', () => {
    // Ninety-nine punctual ticks and one that was not.
    const intervals = [...Array(99).fill(0.010), 0.120];
    const summary = summarise(intervals);

    expect(summary.median).toBeCloseTo(0.010, 9);
    expect(summary.max).toBeCloseTo(0.120, 9);
    expect(summary.samples).toBe(100);
  });

  test('the near-worst is a percentile, not the maximum', () => {
    /*
     * Sizing every jog for the worst thing that happened once during startup
     * — a garbage collection, another process waking up — makes stopping
     * distance permanently worse for an event that may never recur. The tail
     * past this is what the run-time warning is for.
     */
    const intervals = [...Array(99).fill(0.010), 5];
    expect(summarise(intervals).worst).toBeCloseTo(0.010, 9);
  });

  test('ignores readings that are not measurements', () => {
    expect(summarise([0.01, NaN, 0.01, undefined, -1]).samples).toBe(2);
  });

  test('says nothing rather than zero when there is nothing to say', () => {
    // Zero would be read downstream as "this host is perfect".
    expect(summarise([])).toBeNull();
    expect(summarise([NaN])).toBeNull();
  });
});

describe('measuring the host', () => {
  test('measures what the timer delivered, not what it was asked for', async () => {
    /*
     * The whole point: `setInterval(…, 10)` delivers about 15ms on Windows,
     * and the jog clock has to size its queue from the delivered figure. The
     * clock is injected so this is a test of the arithmetic rather than of
     * the machine it happens to run on.
     */
    let at = 1000;
    const fired = [];
    const summary = await measureTicks({
      every: 10,
      samples: 3,
      now: () => at,
      setInterval: (fn) => {
        fired.push(fn);
        // Three late ticks: 16ms each, not the 10 asked for.
        for (let i = 0; i < 3; i += 1) {
          at += 16;
          fn();
        }
        return 'timer';
      },
      clearInterval: () => {},
    });

    expect(summary.median).toBeCloseTo(0.016, 9);
    expect(summary.samples).toBe(3);
  });

  test('stops the timer once it has enough samples', async () => {
    let at = 0;
    let cleared = null;
    await measureTicks({
      every: 10,
      samples: 2,
      now: () => at,
      setInterval: (fn) => {
        for (let i = 0; i < 2; i += 1) {
          at += 10;
          fn();
        }
        return 'the-timer';
      },
      clearInterval: (timer) => { cleared = timer; },
    });

    expect(cleared).toBe('the-timer');
  });
});
