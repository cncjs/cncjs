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
 *
 * Both positions, always. The drawing carries this as one of three modes an
 * author picks between; here it is the only one, because the choice is not
 * worth a control. Work position answers "where am I in this job" and
 * machine position answers "where am I in the machine", and the second is
 * exactly what is wanted at the moments the first stops making sense — a
 * zero set against the wrong corner, a job that starts somewhere
 * unexpected, an axis near its limit. Showing it costs one small line.
 */
export const AxisRow = ({ axis, value, machineValue, last, strip }) => (
  <div
    role="group"
    aria-label={axis}
    className={[
      // A floor, not a height. Left to the type alone the rows sat closer
      // together than anything else on the panel; told to fill the card they
      // went to 67px against the drawing's 56. `--ctl` is the panel's own
      // touch height and lands between the two.
      'flex min-h-ctl min-w-0 flex-1 items-center gap-1 overflow-hidden',
      // A strip only where the drawing draws one — beside the jog keys on a
      // phone, where the position is a check and the keys are the subject.
      // Everywhere else the readout is the subject and stays stacked, with
      // the figures large enough to read from the machine.
      strip
        ? 'flex-col justify-center @3xl/shell:flex-row @3xl/shell:gap-3'
        : 'flex-row gap-3',

      last
        ? ''
        : (strip
          ? 'border-r border-line @3xl/shell:border-b @3xl/shell:border-r-0'
          : 'border-b border-line'),
    ].join(' ')}
  >
    <span
      className={strip
      ? 'text-cap font-semibold text-mut @3xl/shell:w-5 @3xl/shell:text-lead @3xl/shell:text-ink'
      : 'w-5 text-lead font-semibold text-ink'}
    >
      {axis}
    </span>
    {/*
      * A grid, not two stacked lines, so the two readings line up on their
      * digits rather than on the edge of the card.
      *
      * `mm` belongs to the work reading and sits in its own column; the machine
      * reading is in the first column under the figure it is being compared
      * with. Right-aligned to the unit instead, the digits of one sit under the
      * `mm` of the other and the two numbers cannot be read against each other,
      * which is the only reason to show them together.
      */}
    <span className={`grid min-w-0 grid-cols-[auto_auto] items-baseline gap-x-1 ${strip ? 'justify-center @3xl/shell:flex-1 @3xl/shell:justify-end' : 'flex-1 justify-end'}`}>
      <span className={`justify-self-end truncate font-num font-medium tabular-nums text-ink ${strip ? 'text-read @3xl/shell:text-val' : 'text-val'}`}>
        {formatPosition(value)}
      </span>
      <span className="font-num text-note text-mut">mm</span>
      {/* No unit of its own: it is the same millimetres measured from somewhere
        * else, and saying so twice a row adds nothing. */}
      <span className="col-start-1 justify-self-end truncate font-num text-note tabular-nums text-mut">
        {formatPosition(machineValue)}
      </span>
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
const Dro = ({ position, machinePosition, wcs, strip = false, className = '' }) => (
  <div className={`flex min-h-0 flex-1 ${strip ? '@3xl/shell:flex-col' : 'flex-col'} ${className}`}>
    {['x', 'y', 'z'].map((axis, index) => (
      <AxisRow
        key={axis}
        axis={axis.toUpperCase()}
        value={position[axis]}
        machineValue={machinePosition[axis]}
        last={index === 2}
        strip={strip}
      />
    ))}
    {wcs ? <span className="sr-only">{wcs}</span> : null}
  </div>
);

export default Dro;
