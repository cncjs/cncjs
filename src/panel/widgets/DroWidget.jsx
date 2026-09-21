import Card from '../ui/Card';
import Dro from '../ui/Dro';
import { NO_READING } from '../machine/readings';

/**
 * Where the tool is.
 *
 * One widget, two shapes, and the shell decides which. At the panel the axes
 * stack — one reading per line, large enough to read from the machine. On a
 * phone they sit across, because three lines of that size would be most of the
 * screen and the jog keys have to be on it too.
 *
 * It takes that from the named shell container rather than from its own width:
 * the card is about 350px wide in both places, so its own width cannot tell
 * the two apart.
 *
 * The coordinate system is named in the header rather than assumed. A position
 * without it means nothing, and "which zero is this" sits behind most of the
 * ways a job goes wrong.
 */
const DroWidget = ({ machine, label = 'Pozycja robocza', strip = false, className = '' }) => (
  <Card
    label={label}
    aside={(
      /* The coordinate system as a marker rather than a footnote. It is the
       * answer to "which zero are these measured from", which is the
       * question behind most of the ways a job goes wrong, and as plain
       * muted text it read as a label on the card rather than a reading. */
      <span className="rounded-ctl border border-line bg-field px-3 py-1 text-base font-semibold uppercase tracking-[0.08em] text-ink">
        {machine.modal.wcs || NO_READING}
      </span>
    )}
    className={className}
    bodyClassName="gap-0"
  >
    <Dro
      position={machine.position}
      machinePosition={machine.machinePosition}
      wcs={machine.modal.wcs}
      strip={strip}
    />
  </Card>
);

export default DroWidget;
