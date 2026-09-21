import Button from '../ui/Button';
import DroWidget from '../widgets/DroWidget';
import JobWidget from '../widgets/JobWidget';
import ToolWidget from '../widgets/ToolWidget';
import ZHeightWidget from '../widgets/ZHeightWidget';

/**
 * The screen an operator leaves up while a job runs.
 *
 * It places widgets and decides nothing else. Every arrangement inside a
 * widget is the widget's own business, made from the room this screen gives
 * it — which is what lets the same component be a narrow tile here and a
 * whole screen elsewhere without a second implementation.
 */
const Dashboard = ({ machine, onGo }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-gap">
    <div className="flex min-h-0 flex-1 gap-gap">
      <ToolWidget machine={machine} className="flex-1">
        {/*
          * The three places an operator goes next, put where the hand already
          * is rather than making them find the rail.
          */}
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
        {/* The readout is sized by its own type and does not give; the job
          * card takes whatever is left, which is what keeps its controls
          * inside the card when the column is short. */}
        <DroWidget machine={machine} className="shrink-0" />
        <JobWidget machine={machine} className="min-h-0 flex-1" />
      </div>
    </div>

    <ZHeightWidget machine={machine} />
  </div>
);

export default Dashboard;
