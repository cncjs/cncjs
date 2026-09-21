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
  <div className="@container flex min-h-0 flex-1 flex-col gap-gap @3xl:flex-row">
    {/* Side by side, the jog card is sized and the rest of the row takes
      * what is left — the mockup's proportion, and the pad is what decides
      * it: four keys wide plus the card's own padding, which `--jcard` says
      * in those terms. Stacked, it takes the width it is given; a fixed
      * 372px card in a 390px frame would leave the screen with a margin on
      * one side and nothing on the other. */}
    <JogWidget machine={machine} className="shrink-0 @3xl:w-jcard" />

    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap">
      {/* A strip on a phone, where the keys are the subject and the position
        * is the check. Stacked at the panel, where it is the other way
        * round. The drawing shows both and they are the same widget. */}
      {/* A strip at every size here, not only on a phone. On this screen the
        * position is a check between key presses and the toolpath is what is
        * being watched, so one line rather than three hands the difference
        * back to the canvas below. */}
      <DroWidget machine={machine} label="Pozycja" strip className="shrink-0" />

      {/*
        * The handful of facts checked before touching a jog key, on one line
        * — all four of them, not two rows of two.
        *
        * They are four short readings on a wide strip, so a grid of two broad
        * columns spent the width on air and the height on a second row. Read
        * across, they are one sentence about the machine and are taken in at a
        * glance. They wrap only if the strip ever gets too narrow to hold them.
        *
        * Not on a phone. The drawing leaves it out there, and the reason shows
        * in the arithmetic: keeping it costs the readout its place on the
        * screen, and a position you have to scroll to is worse than four facts
        * you can find one tap away.
        */}
      <Card className="hidden shrink-0 !p-3 @3xl/shell:flex" bodyClassName="gap-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-num text-note leading-tight text-mut">
          <span>stan · <span className="text-ink">{machine.status.word}</span></span>
          <span>układ · <span className="text-ink">{machine.modal.wcs || NO_READING}</span></span>
          <span>posuw · <span className="text-ink">{reading(machine.tool.feedrate)}</span> mm/min</span>
          <span>wrzeciono · <span className="text-ink">{reading(machine.tool.spindle)}</span> obr/min</span>
        </div>
      </Card>

      {/* The canvas is the first thing to go when the screen is a phone:
        * it is the one panel here that says nothing an operator needs while
        * their hand is on a jog key. */}
      <Card className="hidden min-h-0 flex-1 @3xl/shell:flex" bodyClassName="items-center justify-center">
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
