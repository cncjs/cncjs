import { formatPosition } from '../machine/readings';

/**
 * One axis of the digital readout.
 *
 * The figure is monospace with tabular figures and it is the largest type on
 * the screen. That is not emphasis for its own sake: a position that shuffles
 * its own digits as it changes cannot be read at a glance while the machine is
 * moving, which is the only time anyone looks at it.
 *
 * Named, so the row is a labelled reading rather than three spans that only
 * mean something to a reader who can see which line they are on.
 */
export const AxisRow = ({ axis, value, last }) => (
  <div
    role="group"
    aria-label={axis}
    className={`flex flex-1 items-center gap-3 ${last ? '' : 'border-b border-line'}`}
  >
    <span className="w-5 text-lead font-semibold text-ink">{axis}</span>
    <span className="flex flex-1 items-baseline justify-end gap-1">
      <span className="font-num text-val font-medium tabular-nums text-ink">
        {formatPosition(value)}
      </span>
      <span className="font-num text-note text-mut">mm</span>
    </span>
  </div>
);

/**
 * The readout, with the coordinate system it is measured in.
 *
 * The system is named in the header rather than assumed. A position means
 * nothing without it, and "which zero is this" is the question behind most
 * of the ways a job goes wrong.
 */
const Dro = ({ position, wcs, className = '' }) => (
  <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
    {['x', 'y', 'z'].map((axis, index) => (
      <AxisRow
        key={axis}
        axis={axis.toUpperCase()}
        value={position[axis]}
        last={index === 2}
      />
    ))}
    {wcs ? <span className="sr-only">{wcs}</span> : null}
  </div>
);

export default Dro;
