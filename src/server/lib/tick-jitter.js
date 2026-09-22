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
 * So it is measured rather than assumed — and measured from the jog clock's
 * own ticks, because a throwaway timer run at startup measures an idle
 * process during the least typical seconds of its life. See
 * `lib/host-timing` for what is done with these numbers.
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

export default summarise;
