import { formatPosition } from '../machine/readings';
import { t } from '../i18n';

/**
 * The readout when the position is what the screen is for.
 *
 * One axis a line, the figures as large as the panel goes. This is the shape
 * for a screen somebody stands in front of to read where the machine is —
 * across a workshop, at a glance, while it moves.
 *
 * The figures are monospace with tabular digits, which is not emphasis for its
 * own sake: a number that reshuffles its own digits as it changes cannot be
 * read while it changes, and that is the only time anyone looks.
 */
const Row = ({ axis, value, machineValue, last }) => (
  <div
    role="group"
    aria-label={axis}
    className={[
      // `basis`, not a minimum. A floor the card cannot honour is not a floor,
      // it is an overflow — the rows took 52px each in a card with 135 for
      // three of them and finished below its bottom edge. As a basis they are
      // 52 where there is room and give way together where there is not.
      // A floor and a ceiling. Without the ceiling a phone gave each row 117px
      // for a 31px figure — the card was the subject of the screen and took
      // the room, but spent it all on air above the numbers instead of on
      // the numbers.
      // A floor, a preference and a ceiling.
      //
      // The preference differs by shell, and it is the only lever that
      // works: at the panel the column is short and 52 is what fits, on a
      // phone the column is the whole screen and 52 left four pixels of air
      // over a 31px figure. The ceiling stops the other failure — told to
      // fill, a row took 117px and spent all of it above the number rather
      // than on the number.
      'flex min-w-0 flex-1 basis-btnh max-h-btnh items-center gap-3 overflow-hidden @3xl/shell:basis-ctl',
      last ? '' : 'border-b border-line',
    ].join(' ')}
  >
    <span className="w-5 text-lead font-semibold text-ink">{axis}</span>

    {/*
      * A grid so the two readings line up on their digits rather than on the
      * edge of the card. `mm` belongs to the work reading and has its own
      * column; the machine reading sits in the first column, under the figure
      * it is there to be compared with. Aligned to the unit instead, the digits
      * of one sit under the `mm` of the other and neither can be read against
      * the other — which is the only reason to show them together.
      */}
    <span className="grid min-w-0 flex-1 grid-cols-[auto_auto] items-baseline justify-end gap-x-1">
      <span className="justify-self-end truncate font-num text-val font-medium tabular-nums text-ink">
        {formatPosition(value)}
      </span>
      <span className="font-num text-note text-mut">{t('units.mm')}</span>
      {/*
        * No unit of its own — the same millimetres measured from somewhere
        * else. `leading-none` because the default line box puts six pixels of
        * air under a twelve-pixel figure, three rows over, which is the room
        * the rows need to stand off their own dividers.
        */}
      <span className="col-start-1 justify-self-end truncate font-num text-note leading-none tabular-nums text-mut">
        {formatPosition(machineValue)}
      </span>
    </span>
  </div>
);

const DroStack = ({ position, machinePosition, className = '' }) => (
  <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
    {['x', 'y', 'z'].map((axis, index) => (
      <Row
        key={axis}
        axis={axis.toUpperCase()}
        value={position[axis]}
        machineValue={machinePosition[axis]}
        last={index === 2}
      />
    ))}
  </div>
);

export default DroStack;
