import Card from '../ui/Card';
import Dro from '../ui/Dro';
import { NO_READING } from '../machine/readings';

/**
 * Where the tool is.
 *
 * One widget, two shapes. Narrow, the axes stack — one reading per line, which
 * is how the dashboard column wants it. Wide, they sit side by side, which is
 * what the jog screen wants when the readout is a strip above a canvas.
 *
 * The coordinate system is named in the header rather than assumed. A position
 * without it means nothing, and "which zero is this" sits behind most of the
 * ways a job goes wrong.
 */
const DroWidget = ({ machine, label = 'Pozycja robocza', className = '' }) => (
  <Card
    label={label}
    aside={machine.modal.wcs || NO_READING}
    className={`@container shrink-0 ${className}`}
    bodyClassName="gap-0"
  >
    <Dro
      position={machine.position}
      wcs={machine.modal.wcs}
      className="@2xl:flex-row @2xl:gap-6"
    />
  </Card>
);

export default DroWidget;
