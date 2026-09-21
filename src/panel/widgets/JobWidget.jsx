import Button from '../ui/Button';
import Card from '../ui/Card';
import Meter from '../ui/Meter';
import { NO_READING } from '../machine/readings';

const reading = (value) => (value === null || value === undefined ? NO_READING : value);

/**
 * How far through the job the machine is.
 *
 * Driven by lines *received*, not sent. Sent counts what has been handed to
 * the controller, which runs several seconds behind while its planner drains —
 * a bar driven by that reads ahead of the tool and reaches the end with the
 * job still cutting.
 *
 * With nothing loaded it says so rather than showing a bar at zero. A bar at
 * zero is a claim that a job exists and has stalled.
 *
 * Start and Pause are drawn and dead. Running a file is the one thing on
 * this panel that moves a machine for minutes without anyone's hand on it,
 * and the sender commands behind these two have not been wired or tested
 * against a controller yet. They are shown because a control that appears
 * later moves everything around it when it does.
 *
 * This card yields height to the readout beside it. The dashboard's right
 * column is full at 768 and something has to; the position is what the
 * screen is for, and a percentage that reads `0` for most of a job does not
 * need the size of a coordinate.
 */
const JobWidget = ({ machine, label = 'Przebieg zadania', className = '' }) => {
  const { job, tool } = machine;

  return (
    <Card label={label} className={`@container min-h-0 ${className}`} bodyClassName="justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <span className="font-num text-head font-medium tabular-nums text-ink">
          {job ? job.percent : 0}
        </span>
        <span className="min-w-0 truncate font-num text-note text-mut">
          % · {job ? `linia ${job.received}/${job.total}` : 'brak zadania'}
        </span>
      </div>

      <Meter percent={job ? job.percent : 0} label={label} tone="bg-grn" />

      {/* Two columns wherever they fit. In one column these four facts are
        * four lines, and the 34px that costs comes straight out of the
        * readout above — which is the reading the screen is for. */}
      <div className="grid shrink-0 grid-cols-1 gap-x-gap gap-y-1 font-num text-note text-mut @xs:grid-cols-2">
        <span className="truncate">posuw {reading(tool.feedrate)} mm/min</span>
        <span className="truncate">obroty {reading(tool.spindle)} rpm</span>
        <span className="truncate">plik {job ? job.name : NO_READING}</span>
        <span className="truncate">
          pozostało {job ? `${Math.round(job.remaining / 60)} min` : NO_READING}
        </span>
      </div>

      {/* Only where there is no status bar to carry them. At the panel the
        * job lives along the bottom, and two Starts on one screen is one
        * too many. */}
      <div className="flex gap-3 @3xl/shell:hidden">
        <Button tone="go" disabled className="h-chiph min-w-0 flex-1">Start zadania</Button>
        <Button disabled className="h-chiph min-w-0">Pauza</Button>
      </div>
    </Card>
  );
};

export default JobWidget;
