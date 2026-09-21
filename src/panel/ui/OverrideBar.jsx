import Meter from './Meter';

/**
 * A percentage the operator can lean on while a job runs, and how far it is
 * leaning.
 *
 * The bar is a reading, not decoration. 100% sits in the middle of the range
 * an override moves through, so where it sits answers "did I nudge this and
 * forget" faster than the number does — which is why the scale runs to 200
 * rather than stopping at full.
 */
const OverrideBar = ({ label, percent }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-baseline justify-between">
      <span className="font-num text-note text-mut">{label}</span>
      <span className="font-num text-note font-medium text-ink">{percent}%</span>
    </div>
    <Meter percent={percent} max={200} label={label} />
  </div>
);

export default OverrideBar;
