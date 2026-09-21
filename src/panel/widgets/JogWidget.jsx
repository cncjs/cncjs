import { useState } from 'react';
import AxisControls from '../ui/AxisControls';
import AxisDrawer from '../ui/AxisDrawer';
import Card from '../ui/Card';
import JogPad from '../ui/JogPad';
import JogPadTall from '../ui/JogPadTall';
import { jog, XY_STEPS, Z_STEPS } from '../machine/jog';

/**
 * Moving the machine by hand.
 *
 * Two arrangements of the same controls, and the difference is not spacing —
 * it is what a phone is for. At the panel there is room for the keys and both
 * axis groups at once, so nothing is hidden and nothing is folded. On a phone
 * the keys are the screen: Z moves from beside the XY cross to underneath it,
 * which buys every key a third more width, and the step and feed rate fold
 * into a line each because they are set once and then left alone for a long
 * stretch of work.
 *
 * Both are rendered and one is hidden by a container query rather than one
 * being chosen in JavaScript. Two reasons. A media query would measure the
 * window, which is the wrong number inside a scaled preview frame; and the
 * step and speed are held here, above both, so changing size never loses the
 * setting the way two separately mounted widgets would.
 *
 * Neither arrangement has a branch inside it. What they share is this widget:
 * the state, the machine, and what a key press means.
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

  const keys = {
    onJog: move,
    onHome: () => {},
    onPark: () => {},
    disabled: !connected,
    canHome: false,
  };

  // The two axis groups, one description each. Both arrangements show the same
  // two; only the shape they are drawn in differs.
  const xy = {
    title: 'XY',
    steps: XY_STEPS,
    step: xyStep,
    onStep: setXyStep,
    speed: xySpeed,
    onSpeed: setXySpeed,
    fine: 100,
    coarse: 500,
    min: 100,
    max: 5000,
    disabled: !connected,
  };
  const z = {
    title: 'Z',
    steps: Z_STEPS,
    step: zStep,
    onStep: setZStep,
    speed: zSpeed,
    onSpeed: setZSpeed,
    fine: 50,
    coarse: 200,
    min: 50,
    max: 2000,
    disabled: !connected,
  };

  return (
    <Card className={`min-h-0 overflow-hidden ${className}`} bodyClassName="gap-0">
      {/* At the panel: the keys at their drawn size, both groups open below
        * them, nothing folded away. */}
      <div className="hidden min-h-0 flex-1 flex-col gap-gap overflow-auto @3xl/shell:flex">
        <div className="shrink-0">
          <JogPad {...keys} />
        </div>
        {/* XY and Z are the same decision asked twice, so they stay together:
          * split across a fold, the second one is easy to miss. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap">
          <AxisControls {...xy} />
          <AxisControls {...z} />
        </div>
      </div>

      {/* On a phone: the keys take the height, the settings take a line each. */}
      <div className="flex min-h-0 flex-1 flex-col gap-gap @3xl/shell:hidden">
        <JogPadTall {...keys} />
        {/* A wider gap than the one between the keys, so the settings read as a
          * separate block rather than a fifth row of the pad. */}
        <AxisDrawer {...xy} />
        <AxisDrawer {...z} />
      </div>
    </Card>
  );
};

export default JogWidget;
