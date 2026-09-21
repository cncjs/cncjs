import DroWidget from '../widgets/DroWidget';
import JogWidget from '../widgets/JogWidget';

/**
 * Jogging on a phone: the keys, and where they got to.
 *
 * No toolpath and no fact strip. The canvas says nothing an operator needs
 * while a thumb is on a jog key, and the four facts cost the readout its place
 * on the screen — a position you have to scroll to is worse than four facts
 * one tap away.
 *
 * The keys take the slack and the readout keeps its own height. It is the pad
 * that benefits from every spare pixel: it is what the screen is for and what
 * a thumb has to hit without looking.
 */
const JogPhone = ({ machine }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-gap">
    <JogWidget machine={machine} className="min-h-0 flex-1" />
    <DroWidget machine={machine} label="Pozycja" strip className="shrink-0" />
  </div>
);

export default JogPhone;
