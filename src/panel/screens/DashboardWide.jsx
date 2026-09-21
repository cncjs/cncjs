import Button from '../ui/Button';
import DroWidget from '../widgets/DroWidget';
import JobWidget from '../widgets/JobWidget';
import ToolWidget from '../widgets/ToolWidget';
import ZHeightWidget from '../widgets/ZHeightWidget';

/**
 * The dashboard at the panel: everything at once.
 *
 * Tool and spindle with the overrides on the left, the readout and the job on
 * the right, the Z height across the bottom. Nothing is folded and nothing is
 * left out, because there is room for all of it.
 *
 * The readout takes the slack in that column and the job card keeps its own
 * height. The other way round left the job 218px for 250px of content and its
 * four facts collapsed to five pixels a line — present, unreadable, and
 * reported as missing.
 */
const DashboardWide = ({ machine, onGo }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-gap">
    <div className="flex min-h-0 flex-1 gap-gap">
      <ToolWidget machine={machine} className="flex-1">
        {/* The three places an operator goes next, put where the hand already
          * is rather than making them find the rail. */}
        <div className="flex gap-3">
          {[
            { id: 'probe', label: 'Sonda Z' },
            { id: 'jog', label: 'Jog' },
            { id: 'files', label: 'Pliki' },
          ].map(({ id, label }) => (
            <Button
              key={id}
              onClick={() => onGo(id)}
              disabled={id !== 'jog'}
              className="h-ctl flex-1"
            >
              {label}
            </Button>
          ))}
        </div>
      </ToolWidget>

      <div className="flex w-side shrink-0 flex-col gap-gap">
        <DroWidget machine={machine} className="min-h-0 flex-1" />
        <JobWidget machine={machine} className="shrink-0" />
      </div>
    </div>

    <ZHeightWidget machine={machine} />
  </div>
);

export default DashboardWide;
