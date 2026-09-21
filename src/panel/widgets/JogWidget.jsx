import { useState } from 'react';
import AxisControls from '../ui/AxisControls';
import Card from '../ui/Card';
import JogPad from '../ui/JogPad';
import { jog, XY_STEPS, Z_STEPS } from '../machine/jog';

/**
 * Moving the machine by hand — the whole of it, as one component.
 *
 * **It lays itself out from the room it is given, not from the window.** The
 * same widget is a tile on the dashboard and the body of the jog screen, and
 * in those two places it has 372px and 863px of width inside an identical
 * 1024px viewport. A media query cannot tell them apart; a container query
 * can, which is why the root declares `@container` and every arrangement
 * decision below is an `@4xl:` on it.
 *
 * Narrow: the pad, then the axis controls stacked under it.
 * Wide: the pad on the left, XY and Z controls side by side to its right.
 * The threshold is `@4xl` because that is where an axis column is wide enough
 * for a speed stepper — four keys either side of a reading. Measured: below
 * it the two columns are narrower than the control they hold.
 *
 * Height is handled without a breakpoint at all. The pad is a fixed target an
 * operator hits without looking, so it keeps its size; the step and speed
 * controls are `flex-1` over a floor, so they take up the slack in a tall tile
 * and close to the floor in a short one. The body scrolls only when even the
 * floor does not fit.
 *
 * No header: the mockup gives this card none, and it is right to — the keys
 * say what it is, and a caption would cost a row the pad wants.
 *
 * Nothing above this component passes a layout. A screen places it and gets
 * out of the way — which is what makes it the same widget in both places
 * rather than two that look alike.
 */
const JogWidget = ({ machine, className = '' }) => {
  const { connected, type } = machine;
  const [xyStep, setXyStep] = useState(1);
  const [zStep, setZStep] = useState(1);
  const [xySpeed, setXySpeed] = useState(1500);
  const [zSpeed, setZSpeed] = useState(600);

  const move = (axis, sign) => jog({
    type,
    axis,
    distance: sign * (axis === 'z' ? zStep : xyStep),
    feedrate: axis === 'z' ? zSpeed : xySpeed,
  });

  return (
    <Card className={`@container min-h-0 overflow-hidden ${className}`}>
      <div className="flex min-h-0 flex-1 flex-col gap-gap overflow-auto @4xl:flex-row @4xl:gap-6">
        <div className="shrink-0 @4xl:w-jpad">
          <JogPad
            onJog={move}
            onHome={() => {}}
            onPark={() => {}}
            disabled={!connected}
            canHome={false}
          />
        </div>

        {/*
          * The pair is kept together whichever way round it goes: XY and Z are
          * the same decision asked twice, and separating them across a fold
          * makes the second one easy to miss.
          */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap @4xl:flex-row @4xl:gap-6">
          <AxisControls
            title="XY"
            steps={XY_STEPS}
            step={xyStep}
            onStep={setXyStep}
            speed={xySpeed}
            onSpeed={setXySpeed}
            fine={100}
            coarse={500}
            min={100}
            max={5000}
            disabled={!connected}
          />
          <AxisControls
            title="Z"
            steps={Z_STEPS}
            step={zStep}
            onStep={setZStep}
            speed={zSpeed}
            onSpeed={setZSpeed}
            fine={50}
            coarse={200}
            min={50}
            max={2000}
            disabled={!connected}
          />
        </div>
      </div>
    </Card>
  );
};

export default JogWidget;
