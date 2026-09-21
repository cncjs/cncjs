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
 *
 * What it does decide is *which* widgets. On a phone the drawing carries
 * four things — where the tool is, how far through the job, start, and probe
 * Z — and leaves out the tool and spindle readings, the overrides and the Z
 * height. That is a judgement about the screen rather than about the space:
 * a phone is picked up to see where the machine is and to start or stop it,
 * and the rest is read sitting at the panel.
 */
const Dashboard = ({ machine, onGo }) => (
  <div className="@container flex min-h-0 flex-1 flex-col gap-gap">
    <div className="flex min-h-0 flex-1 flex-col gap-gap @3xl:flex-row">
      <ToolWidget machine={machine} className="hidden flex-1 @3xl/shell:flex">
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

      <div className="flex min-h-0 flex-col gap-gap @3xl:w-side @3xl:shrink-0">
        {/* The readout is sized by its own type and does not give; the job
          * card takes whatever is left, which is what keeps its controls
          * inside the card when the column is short. */}
        {/* The readout shares the column rather than hugging its three
          * lines. It is the reading this screen exists for, and at the
          * natural height of the type the rows sit closer together than
          * anything else on the panel. */}
        <DroWidget machine={machine} className="min-h-0 flex-1" />
        {/* The job card keeps its own height and the readout takes the
          * slack. Splitting the column evenly left this one 218px for 250px
          * of content and its four facts collapsed to five pixels a line —
          * present, unreadable, and reported as missing. */}
        <JobWidget machine={machine} className="shrink-0" />

        {/* Drawn on the phone as its own full-width control rather than
          * inside the height card, which the phone does not carry. Dead for
          * now, like every probe control here. */}
        <Button tone="soft" disabled className="h-ctl shrink-0 @3xl/shell:hidden">
          Sonduj Z
        </Button>
      </div>
    </div>

    <ZHeightWidget machine={machine} className="hidden @3xl/shell:flex" />
  </div>
);

export default Dashboard;
