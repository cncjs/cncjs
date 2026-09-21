import Card from '../ui/Card';
import DroWidget from '../widgets/DroWidget';
import JogWidget from '../widgets/JogWidget';
import { useFooterContent } from '../ui/footerSlot';
import { NO_READING } from '../machine/readings';

const reading = (value) => (value === null || value === undefined ? NO_READING : value);

/**
 * Jogging at the panel: the keys beside the toolpath.
 *
 * The jog card is sized — four keys wide plus its own padding, which `--jcard`
 * says in those terms — and the rest of the row is the preview. The position
 * is a strip rather than a readout here: on this screen it answers "did that
 * move do what I expected" between key presses, and one line instead of three
 * hands ninety pixels back to the canvas.
 */
const JogWide = ({ machine }) => {
  /*
   * The facts checked before touching a jog key go in the status bar rather
   * than in a card of their own. They are one line of text and they were
   * costing the toolpath a card's worth of height to say it; the bar is
   * already there and already empty on this screen.
   *
   * This is the first use of the footer slot. Which contributor wins will be a
   * setting once there is a settings screen — until then the open screen
   * decides, and the job line is what shows when nothing does.
   */
  useFooterContent(() => (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-num text-base leading-tight text-mut">
      <span>stan · <span className="text-ink">{machine.status.word}</span></span>
      <span>układ · <span className="text-ink">{machine.modal.wcs || NO_READING}</span></span>
      <span>posuw · <span className="text-ink">{reading(machine.tool.feedrate)}</span> mm/min</span>
      <span>wrzeciono · <span className="text-ink">{reading(machine.tool.spindle)}</span> obr/min</span>
    </span>
  ), [machine.status.word, machine.modal.wcs, machine.tool.feedrate, machine.tool.spindle]);

  return (
    <div className="flex min-h-0 flex-1 gap-gap">
      <JogWidget machine={machine} className="min-h-0 w-jcard shrink-0" />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap">
        <DroWidget machine={machine} label="Pozycja" strip className="shrink-0" />

        <Card className="min-h-0 flex-1" bodyClassName="items-center justify-center">
          <span className="text-center font-num text-note text-mut">
            podgląd 3D toolpath · pozycja narzędzia
            <br />
            &lt;canvas&gt; three.js
          </span>
        </Card>
      </div>
    </div>
  );
};

export default JogWide;
