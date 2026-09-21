import Button from '../ui/Button';
import Card from '../ui/Card';
import { formatPosition, NO_READING } from '../machine/readings';
import { zero, activeWcsNumber } from '../machine/zero';

/**
 * How far the tool is above the work, and the two things done about it.
 *
 * The figure is the largest type on the panel because it is read from arm's
 * length with one hand on the jog keys and both eyes on the cutter.
 *
 * Zeroing moves nothing: `G10 L20` rewrites the offset between machine and
 * work coordinates so that where the tool is *now* reads as zero — which is
 * what an operator means after jogging down onto the corner of the stock.
 * Both buttons stay dead unless the controller has said which coordinate
 * system is active, because that command has to name one and a guess is
 * discovered only by a tool moving to the wrong place under power.
 *
 * Wide, the reading and the buttons share a line; narrow, the buttons drop
 * beneath it. The reading never shrinks — it is the point of the widget.
 */
const ZHeightWidget = ({ machine, label = 'Wysokość Z', className = '' }) => {
  const { position, machinePosition, modal, connected } = machine;
  const canZero = connected && activeWcsNumber(modal) > 0;
  const machineZ = formatPosition(machinePosition.z);

  return (
    <Card
      label={label}
      aside={machineZ === NO_READING ? null : `masz. ${machineZ} mm`}
      className={`@container shrink-0 ${className}`}
    >
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-end @xl:gap-6">
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="font-num text-dro font-medium tabular-nums text-ink">
            {formatPosition(position.z)}
          </span>
          <span className="font-num text-lead text-mut">mm</span>
        </span>

        <div className="flex shrink-0 gap-3">
          <Button
            tone="primary"
            disabled={!canZero}
            onClick={() => zero({ modal, axes: ['z'] })}
            className="h-ctl flex-1 @xl:w-chipw @xl:flex-none"
          >
            Zeruj Z
          </Button>
          <Button
            disabled={!canZero}
            onClick={() => zero({ modal, axes: ['x', 'y'] })}
            className="h-ctl flex-1 @xl:w-chipw @xl:flex-none"
          >
            Zeruj XY
          </Button>
          {/*
            * Drawn, and deliberately dead. Probing drives the tool downwards
            * under power until something stops it, and what `G38.2` should do
            * on this machine has not been settled. It is shown because the
            * rail shows its unbuilt destinations for the same reason: a panel
            * whose controls appear one release at a time moves under the hand
            * of someone who has stopped looking at it.
            */}
          <Button tone="soft" disabled className="h-ctl flex-1 @xl:w-chipw @xl:flex-none">
            Sonduj Z
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ZHeightWidget;
