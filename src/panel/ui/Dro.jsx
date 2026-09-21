import { formatPosition } from '../machine/readings';

/**
 * One axis of the digital readout.
 *
 * The figure is monospace with tabular figures. That is not emphasis for its
 * own sake: a position that shuffles its own digits as it changes cannot be
 * read at a glance while the machine is moving, which is the only time anyone
 * looks at it.
 *
 * Both positions, always. Work position answers "where am I in this job" and
 * machine position answers "where am I in the machine", and the second is
 * exactly what is wanted at the moments the first stops making sense — a zero
 * set against the wrong corner, a job that starts somewhere unexpected, an
 * axis near its limit.
 *
 * Named, so the row is a labelled reading rather than three spans that only
 * mean something to a reader who can see which line they are on.
 */
export const AxisRow = ({ axis, value, machineValue, last, strip }) => (
  <div
    role="group"
    aria-label={axis}
    className={[
      'flex min-w-0 flex-1 items-center gap-1 overflow-hidden',
      strip
        // A column of the strip: label above, figures below, a hairline
        // between it and the next axis.
        ? `flex-col justify-center ${last ? '' : 'border-r border-line'}`
        /*
         * A line of the readout: label left, figures right.
         *
         * `basis-ctl` rather than `min-h-ctl`. As a hard floor it asked for
         * 52px a row whatever the card had, and on the dashboard at 768 the
         * card has 135 for three of them — so the third row finished two
         * pixels below the bottom of the card it was drawn in, which is how it
         * was reported. A basis is a preference: the rows are 52 where there is
         * room and give way together where there is not, and never leave the
         * card they belong to.
         */
        : `flex-row gap-3 basis-ctl ${last ? '' : 'border-b border-line'}`,
    ].join(' ')}
  >
    <span className={strip ? 'text-cap font-semibold text-mut' : 'w-5 text-lead font-semibold text-ink'}>
      {axis}
    </span>

    {/*
      * A grid, not two stacked lines, so the two readings line up on their
      * digits rather than on the edge of the card. `mm` belongs to the work
      * reading and sits in its own column; the machine reading is in the first
      * column, under the figure it is being compared with.
      */}
    <span className={`grid min-w-0 grid-cols-[auto_auto] items-baseline gap-x-1 ${strip ? 'justify-center' : 'flex-1 justify-end'}`}>
      <span className={`justify-self-end truncate font-num font-medium tabular-nums text-ink ${strip ? 'text-read' : 'text-val'}`}>
        {formatPosition(value)}
      </span>
      {/*
        * The unit is the machine's, not the axis's, and on a strip it would be
        * repeated three times across a hundred pixels a column. Thirteen
        * pixels three times over to say the same thing is what pushed the
        * widest reading to within three pixels of the divider beside it.
        */}
      {strip ? null : <span className="font-num text-note text-mut">mm</span>}
      {/*
        * The machine reading carries no unit either way — the same millimetres
        * measured from somewhere else. Centred under the work reading on the
        * strip, where the two read as one stacked pair; sharing a right edge
        * in the readout, where that is what makes them comparable.
        */}
      <span className={`col-start-1 truncate font-num text-note tabular-nums text-mut ${strip ? 'justify-self-center' : 'justify-self-end'}`}>
        {formatPosition(machineValue)}
      </span>
    </span>
  </div>
);

/**
 * The readout, with the coordinate system it is measured in.
 *
 * Two shapes, and which one is right is a question about the screen rather
 * than about how wide it is. **Stacked where the position is the subject, a
 * strip where it is a check.**
 *
 * On the dashboard it is what the screen is for, and it gets the height and
 * the large figures. On the jog screen it answers "did that move do what I
 * expected" between key presses, and as one line it hands back a hundred and
 * fourteen pixels to the toolpath — which is the thing actually being watched
 * while the keys are pressed.
 *
 * So the screen says which, and this never infers it from the room it was
 * given. An earlier version did infer it, from the width of the shell, and got
 * the jog screen wrong at every size but the phone.
 *
 * The system is named in the header rather than assumed. A position means
 * nothing without it, and "which zero is this" is the question behind most of
 * the ways a job goes wrong.
 */
const Dro = ({ position, machinePosition, wcs, strip = false, className = '' }) => (
  <div className={`flex min-h-0 flex-1 ${strip ? 'flex-row' : 'flex-col'} ${className}`}>
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
