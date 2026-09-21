import Card from '../ui/Card';
import DroWidget from '../widgets/DroWidget';
import JogWidget from '../widgets/JogWidget';
import { NO_READING } from '../machine/readings';

const reading = (value) => (value === null || value === undefined ? NO_READING : value);

/**
 * Jogging, with room to see what it did.
 *
 * The same `JogWidget` the dashboard can carry as a tile, given most of the
 * screen instead — it rearranges itself and this file says nothing about how.
 */
const JogScreen = ({ machine }) => (
  <div className="flex min-h-0 flex-1 gap-gap">
    {/* The jog card is sized, the rest of the row takes what is left — the
      * mockup's proportion, and the pad is what decides it: four keys wide
      * plus the card's own padding, which `--jcard` says in those terms. */}
    <JogWidget machine={machine} className="w-jcard shrink-0" />

    <div className="flex min-w-0 flex-1 flex-col gap-gap">
      <DroWidget machine={machine} label="Pozycja" />

      {/*
        * The handful of facts checked before touching a jog key, on one line
        * each so the whole answer is taken in at a glance.
        */}
      <Card className="shrink-0" bodyClassName="gap-1">
        <div className="grid grid-cols-2 gap-x-gap gap-y-1 font-num text-note text-mut">
          <span className="truncate">stan · <span className="text-ink">{machine.status.word}</span></span>
          <span className="truncate">układ · <span className="text-ink">{machine.modal.wcs || NO_READING}</span></span>
          <span className="truncate">posuw · <span className="text-ink">{reading(machine.tool.feedrate)}</span> mm/min</span>
          <span className="truncate">wrzeciono · <span className="text-ink">{reading(machine.tool.spindle)}</span> obr/min</span>
        </div>
      </Card>

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

export default JogScreen;
