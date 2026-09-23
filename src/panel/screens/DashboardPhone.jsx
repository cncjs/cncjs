import DroWidget from '../widgets/DroWidget';
import JobWidget from '../widgets/JobWidget';

/**
 * The dashboard on a phone: two things, not eight narrowed.
 *
 * Where the tool is and how far through the job it is. The tool and spindle
 * readings, the overrides and the Z height are not here — that is a judgement
 * about the screen rather than about the space. A phone is picked up beside
 * the machine to see where it is and to start or stop it; the rest is read
 * sitting at the panel.
 *
 * **No bare controls.** A full-width `Sonduj Z` sat under the two cards,
 * disabled, waiting for a probe screen that does not exist — *"sonduj z
 * wylatuje, nie chce miec golych przyciskow"* (2026-09-23). A button with no
 * card around it is a control that belongs to nothing, and a dead one is a
 * control that belongs to nothing and does nothing. It comes back inside
 * whatever card owns probing, when there is one.
 *
 * The readout takes its own height and the job card takes the rest. Its rows
 * hit their ceiling long before a phone screen is used up, so letting it
 * stretch would only put air inside it.
 */
const DashboardPhone = ({ machine }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-gap">
    <DroWidget machine={machine} className="shrink-0" />
    <JobWidget machine={machine} className="min-h-0 flex-1" />
  </div>
);

export default DashboardPhone;
