/**
 * One secondary reading in its own box: a tool number, a spindle speed.
 *
 * Boxed rather than listed because these are readings an operator checks
 * against what they expect, one at a time, rather than scanning as a set.
 */
const StatTile = ({ label, value, unit }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-ctl border border-line bg-field px-3 py-2">
    <span className="truncate font-num text-note text-mut">{label}</span>
    <span className="flex items-baseline gap-2">
      <span className="truncate font-num text-lead font-medium text-ink">{value}</span>
      {unit ? <span className="shrink-0 font-num text-note text-mut">{unit}</span> : null}
    </span>
  </div>
);

export default StatTile;
