import { useState } from 'react';
import AxisControls from '../ui/AxisControls';
import AxisSummary from '../ui/AxisSummary';
import Card from '../ui/Card';
import JogPad from '../ui/JogPad';
import JogPadTall from '../ui/JogPadTall';
import SegmentedChoice from '../ui/SegmentedChoice';
import Sheet from '../ui/Sheet';
import Stepper from '../ui/Stepper';
import controller from '../machine/controller';
import { home } from '../machine/homing';
import { useIsPhone } from '../ui/shell';
import { jog, jogStart, jogStop, XY_STEPS, Z_STEPS } from '../machine/jog';
import ShortcutHelp from '../ui/ShortcutHelp';
import useHoldToJog from '../ui/useHoldToJog';
import useJogKeys from '../ui/useJogKeys';

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
  const phone = useIsPhone();
  const { connected, type } = machine;
  const [xyStep, setXyStep] = useState(1);
  const [zStep, setZStep] = useState(1);
  const [xySpeed, setXySpeed] = useState(1500);
  const [zSpeed, setZSpeed] = useState(600);
  // Which axis group is being set, on a phone. Nothing on the panel, where
  // both are open on the screen already.
  const [editing, setEditing] = useState(null);
  const [helping, setHelping] = useState(false);

  const rateFor = (axis) => (axis === 'z' ? zSpeed : xySpeed);

  /*
   * A tap is one step, a hold keeps going. Both are the same intent at two
   * scales — dial onto an edge, or cross the bed — and an operator should
   * not have to pick a different button before knowing how far they want to
   * go.
   */
  const stepFor = (axis, coarse) => {
    const steps = axis === 'z' ? Z_STEPS : XY_STEPS;
    // Shift is the coarse step: the largest the axis offers, which is what
    // "get across the work" means without asking anyone to change a setting
    // they will have to change back.
    return coarse ? steps[steps.length - 1] : (axis === 'z' ? zStep : xyStep);
  };

  const stepJog = (axis, sign, coarse) => jog({
    type,
    axis,
    distance: sign * stepFor(axis, coarse),
    feedrate: rateFor(axis),
  });

  const holdToJog = useHoldToJog({
    enabled: connected,
    step: (axis, sign) => stepJog(axis, sign),
    start: (axis, sign) => jogStart({
      type, axis, sign, feedrate: rateFor(axis), settings: machine.settings,
    }),
    stop: () => jogStop(type),
  });

  /*
   * The same two behaviours from the keyboard. Arrows are XY because that is
   * what they look like on a bed seen from above; Page Up and Page Down are Z
   * because they are the only keys that already mean up and down without also
   * meaning a direction on the table.
   */
  useJogKeys({
    enabled: connected,
    step: stepJog,
    start: (axis, sign) => jogStart({
      type, axis, sign, feedrate: rateFor(axis), settings: machine.settings,
    }),
    stop: () => jogStop(type),
    onHelp: () => setHelping(true),
  });

  const keys = {
    onJog: holdToJog,
    onHome: () => home(controller),
    onPark: () => {},
    disabled: !connected,
    canHome: machine.canHome,
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

  const open = editing === 'xy' ? xy : (editing === 'z' ? z : null);

  return (
    <Card className={`min-h-0 overflow-hidden ${className}`} bodyClassName="gap-0">
      {/* At the panel: the keys at their drawn size, both groups open below
        * them, nothing folded away. */}
      {phone ? null : (
        <div className="relative flex min-h-0 flex-1 flex-col gap-gap overflow-auto">
          {/* A shortcut nobody knows about is a shortcut that does not exist.
            * It sits in the corner the cross leaves empty rather than in a row
            * of its own, where it pushed every key down by its own height to
            * say one character. Not on a phone: no keyboard to explain. */}
          <button
            type="button"
            onClick={() => setHelping(true)}
            aria-label="Skróty klawiszowe"
            className="absolute left-0 top-0 z-10 size-7 rounded-ctl border border-line bg-field text-base font-semibold text-mut hover:border-acc hover:text-acc"
          >
            ?
          </button>

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
      )}

      {/* On a phone: the keys take the height, the settings take a line each.
        * Tapping a line opens a sheet rather than unfolding in place, because
        * unfolding shrinks the pad and the keys are then somewhere else — and
        * they are hit by a thumb while the eyes are on the cutter. A wider gap
        * than the one between the keys, so the settings read as a separate
        * block rather than a fifth row of the pad. */}
      {phone ? (
        <div className="flex min-h-0 flex-1 flex-col gap-gap">
        <JogPadTall {...keys} />
        <AxisSummary
          title={xy.title}
          step={xyStep}
          speed={xySpeed}
          onOpen={() => setEditing('xy')}
          disabled={!connected}
        />
        <AxisSummary
          title={z.title}
          step={zStep}
          speed={zSpeed}
          onOpen={() => setEditing('z')}
          disabled={!connected}
        />
        </div>
      ) : null}

      {helping ? (
        <ShortcutHelp
          onClose={() => setHelping(false)}
          xyStep={xyStep}
          zStep={zStep}
          xyCoarse={XY_STEPS[XY_STEPS.length - 1]}
          zCoarse={Z_STEPS[Z_STEPS.length - 1]}
        />
      ) : null}

      {open ? (
        <Sheet title={`Jog ${open.title}`} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-2.5">
            <span className="text-label font-semibold uppercase leading-none text-ink">
              Krok <span className="normal-case text-mut">mm</span>
            </span>
            <SegmentedChoice
              options={open.steps}
              value={open.step}
              onChange={open.onStep}
              label={`Krok ${open.title}`}
              unit="mm"
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-label font-semibold uppercase leading-none text-ink">
              Prędkość <span className="normal-case text-mut">mm/min</span>
            </span>
            <Stepper
              value={open.speed}
              onChange={open.onSpeed}
              fine={open.fine}
              coarse={open.coarse}
              min={open.min}
              max={open.max}
              label={`Prędkość ${open.title}`}
            />
          </div>
        </Sheet>
      ) : null}
    </Card>
  );
};

export default JogWidget;
