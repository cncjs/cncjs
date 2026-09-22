/**
 * How punctual this computer's timers actually are.
 *
 * Continuous jogging is a clock: a segment of travel is handed to the machine
 * every `dt`, and the planner holds a small lead so a late tick does not empty
 * it mid-move. How large that lead has to be is not a property of the machine
 * or of Grbl — it is a property of **the computer the server happens to be
 * running on**. `setInterval(…, 10)` delivers about 15ms on this Windows
 * laptop and closer to 10 on a quiet Linux box, and a server on an overloaded
 * host can do far worse.
 *
 * So it is measured rather than assumed, once, at startup. A measured lead is
 * both safer than a guess and more honest: the number can be shown to whoever
 * is standing at the machine, along with what it costs them in stopping
 * distance.
 *
 * Measuring once and keeping the answer is deliberate. A lead that drifted
 * while the machine was moving would make the one thing an operator has to be
 * able to predict — how far it goes after they let go — different every time
 * they let go.
 */

/**
 * The shape of a set of measured intervals, in seconds.
 *
 * The worst case matters more than the average here, which is why the summary
 * keeps it: a lead sized on the median is a lead that is too small every time
 * the host hiccups, and one hiccup is one stutter in the cut.
 */
export const summarise = (intervals) => {
  const sorted = [...intervals].filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);

  if (!sorted.length) {
    return null;
  }

  // Nearest-rank: the smallest value at or above the given fraction of the
  // samples. Rounding the other way put the 99th percentile of a hundred
  // samples on the hundredth — which is the maximum, the one figure this is
  // meant not to be.
  const at = (fraction) => sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];

  return {
    median: at(0.5),
    /*
     * The 99th percentile rather than the maximum. The maximum over a few
     * hundred samples catches whatever else the machine did during those two
     * seconds — a garbage collection, another process waking up — and sizing
     * every jog for the worst thing that happened once makes stopping
     * distance permanently worse for an event that may never recur. The tail
     * beyond this is what the run-time warning is for.
     */
    worst: at(0.99),
    max: sorted[sorted.length - 1],
    samples: sorted.length,
  };
};

/**
 * Measure how late this host's timers run, by running one.
 *
 * Nothing about the machine or the serial port is involved: this is the event
 * loop measuring itself. `every` is the interval asked for, in milliseconds —
 * the same one the jog clock will ask for, because timer behaviour is not
 * linear in the interval and measuring at 10ms says nothing useful about 50.
 */
export const measureTicks = ({ every, samples, setInterval: schedule = setInterval, clearInterval: cancel = clearInterval, now = Date.now } = {}) =>
  new Promise((resolve) => {
    const intervals = [];
    let last = now();
    let timer = null;
    let finished = false;

    // A timer that fires before `schedule` has returned has nothing to
    // cancel yet, so cancelling is done once the handle exists. Real timers
    // never do this; injected ones in tests do, and the alternative is a
    // reference to a variable that is not bound yet.
    const stop = () => {
      if (timer !== null) {
        cancel(timer);
        timer = null;
      }
    };

    timer = schedule(() => {
      const at = now();
      intervals.push((at - last) / 1000);
      last = at;

      if (intervals.length >= samples) {
        finished = true;
        stop();
        resolve(summarise(intervals));
      }
    }, every);

    if (finished) {
      stop();
    }
  });

export default measureTicks;
