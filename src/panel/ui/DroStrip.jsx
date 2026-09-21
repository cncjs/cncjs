import { formatPosition } from '../machine/readings';

/**
 * The readout when the position is a check rather than the subject.
 *
 * Three axes across one line, so the screen it sits on can spend its height on
 * whatever is actually being watched. On the jog screen that is the toolpath,
 * and the position answers "did that move do what I expected" between key
 * presses.
 *
 * No unit. The millimetres are the machine's, not the axis's, and repeating
 * them three times across a hundred pixels a column is what pushed the widest
 * reading to within three pixels of the divider beside it.
 *
 * The figures follow the room the strip has. That is not the same question as
 * which shape the screen asked for — the shape is the screen's, and stays
 * its; how large the digits are inside that shape is a fact about the width
 * available, and a strip 478px wide can carry more than one at 350.
 *
 * 26px is the ceiling at 1024, not a preference. Measured against
 * `-1234.567`, the longest coordinate this panel can show: 26 leaves ten
 * pixels to the divider, 28 leaves four, and 31 crosses it. A readout that
 * fits the number on the screen and not the one the machine might reach is
 * not a readout.
 *
 * Wider still — a Full HD frame gives the strip a thousand pixels — and it
 * goes to `--val`, the token for a machine reading, which is 46px at that
 * target. All three steps are the container's width, not the format: the
 * strip is asking how much room it has, and a `fullhd:` variant would have
 * been asking a different question that happens to agree most of the time.
 */
const Column = ({ axis, value, machineValue, last }) => (
  <div
    role="group"
    aria-label={axis}
    className={[
      'flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden',
      last ? '' : 'border-r border-line',
    ].join(' ')}
  >
    <span className="text-cap font-semibold text-mut">{axis}</span>
    <span className="truncate font-num text-read font-medium tabular-nums text-ink @sm:text-readWide @3xl:text-val">
      {formatPosition(value)}
    </span>
    {/* Centred under the work reading, where the column is a column and the
      * two read as one stacked pair. */}
    <span className="truncate font-num text-note leading-none tabular-nums text-mut">
      {formatPosition(machineValue)}
    </span>
  </div>
);

/*
 * `min-h-btnh` is a floor the card cannot be squeezed through. Without it a
 * short screen gave this 66px, and the columns clipped to nothing — a
 * position card with no position in it. If something has to give on an 800px
 * phone it is not going to be the reading.
 */
const DroStrip = ({ position, machinePosition, className = '' }) => (
  <div className={`@container flex min-h-btnh flex-1 flex-row ${className}`}>
    {['x', 'y', 'z'].map((axis, index) => (
      <Column
        key={axis}
        axis={axis.toUpperCase()}
        value={position[axis]}
        machineValue={machinePosition[axis]}
        last={index === 2}
      />
    ))}
  </div>
);

export default DroStrip;
