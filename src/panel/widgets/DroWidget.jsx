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
const DroWidget = ({ machine, label = 'Pozycja robocza', className = '' }) => (
  <Card
    label={label}
    aside={machine.modal.wcs || NO_READING}
    className={`shrink-0 ${className}`}
    bodyClassName="gap-0"
  >
    <Dro
      position={machine.position}
      wcs={machine.modal.wcs}
    />
  </Card>
);

export default DroWidget;
