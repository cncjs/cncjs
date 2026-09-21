import JogPhone from './JogPhone';
import JogWide from './JogWide';
import { useIsPhone } from '../ui/shell';

/**
 * Jogging.
 *
 * Two layouts, one chosen. They carry different things — the panel has the
 * toolpath and the fact strip, the phone has neither — so writing them as one
 * markup with conditional classes made every change for one a silent change to
 * the other.
 */
const JogScreen = ({ machine }) => (
  useIsPhone() ? <JogPhone machine={machine} /> : <JogWide machine={machine} />
);

export default JogScreen;
