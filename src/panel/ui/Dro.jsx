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
    className={[
      'flex min-w-0 flex-1 items-center gap-1 overflow-hidden',
      // Side by side on a phone, stacked at the panel. Three readings across
      // 350px of phone is the only arrangement that leaves room for anything
      // below them; three lines down a 400px column is the only one that
      // leaves the figures large enough to read across a workshop.
      'flex-col justify-center @3xl/shell:flex-row @3xl/shell:gap-3',
      last ? '' : 'border-r border-line @3xl/shell:border-b @3xl/shell:border-r-0',
    ].join(' ')}
  >
    <span className="text-cap font-semibold text-mut @3xl/shell:w-5 @3xl/shell:text-lead @3xl/shell:text-ink">
      {axis}
    </span>
    <span className="flex min-w-0 items-baseline gap-1 @3xl/shell:flex-1 @3xl/shell:justify-end">
      <span className="truncate font-num text-lead font-medium tabular-nums text-ink @3xl/shell:text-val">
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
  <div className={`flex min-h-0 flex-1 @3xl/shell:flex-col ${className}`}>
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
