import Button from '../ui/Button';
import DroWidget from '../widgets/DroWidget';
import JobWidget from '../widgets/JobWidget';
import { t } from '../i18n';

/**
 * The dashboard on a phone: four things, not eight narrowed.
 *
 * Where the tool is, how far through the job it is, start, and probe Z. The
 * tool and spindle readings, the overrides and the Z height are not here —
 * that is a judgement about the screen rather than about the space. A phone is
 * picked up beside the machine to see where it is and to start or stop it; the
 * rest is read sitting at the panel.
 *
 * The readout takes its own height and the job card takes the rest. Its rows
 * hit their ceiling long before a phone screen is used up, so letting it
 * stretch would only put air inside it.
 */
const DashboardPhone = ({ machine }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-gap">
    <DroWidget machine={machine} className="shrink-0" />
    <JobWidget machine={machine} className="min-h-0 flex-1" />

    {/* Its own full-width control here rather than inside the height card,
      * which this screen does not carry. Dead for now, like every probe
      * control on this panel. */}
    <Button tone="soft" disabled className="h-ctl shrink-0">
      {t('zheight.probeZ')}
    </Button>
  </div>
);

export default DashboardPhone;
