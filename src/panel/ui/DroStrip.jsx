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
    <span className="truncate font-num text-read font-medium tabular-nums text-ink">
      {formatPosition(value)}
    </span>
    {/* Centred under the work reading, where the column is a column and the
      * two read as one stacked pair. */}
    <span className="truncate font-num text-note leading-none tabular-nums text-mut">
      {formatPosition(machineValue)}
    </span>
  </div>
);

const DroStrip = ({ position, machinePosition, className = '' }) => (
  <div className={`flex min-h-0 flex-1 flex-row ${className}`}>
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
