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

      {/* `flex-1` so this column fills the screen on a phone, where it is
        * the whole of it. Without it the dashboard ended 266px short of the
        * bottom while the readout above was squeezed to 4px of air over its
        * figures — the room was there, it just was not being claimed. At
        * the panel it is a fixed column beside the tool card instead. */}
      <div className="flex min-h-0 flex-1 flex-col gap-gap @3xl:w-side @3xl:flex-none @3xl:shrink-0">
        {/* The readout is sized by its own type and does not give; the job
          * card takes whatever is left, which is what keeps its controls
          * inside the card when the column is short. */}
        {/* Which card takes the slack changes with the screen. At the panel
          * the readout does: the column is short and the job card's four
          * facts collapse if it is the one squeezed. On a phone the column
          * is the whole screen and the readout's rows hit their ceiling long
          * before it is used up, so the job card takes the rest rather than
          * leaving air inside the readout. */}
        <DroWidget machine={machine} className="shrink-0 @3xl/shell:min-h-0 @3xl/shell:flex-1" />
        {/* The job card keeps its own height and the readout takes the
          * slack. Splitting the column evenly left this one 218px for 250px
          * of content and its four facts collapsed to five pixels a line —
          * present, unreadable, and reported as missing. */}
        <JobWidget machine={machine} className="min-h-0 flex-1 @3xl/shell:flex-none @3xl/shell:shrink-0" />

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
