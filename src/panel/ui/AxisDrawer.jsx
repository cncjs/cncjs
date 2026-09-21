import SegmentedChoice from './SegmentedChoice';
import Stepper from './Stepper';

/**
 * One axis group's step and speed, folded away until they are wanted.
 *
 * On a phone the jog keys are what the screen is for, and the step and the
 * feed rate are set once and then left alone for a long stretch of work.
 * Standing open they take two thirds of the height the keys could have had;
 * folded, each is a line that still says what it is set to.
 *
 * `<details>` rather than state, because that is exactly what it is: the
 * browser already knows how to open and close a disclosure, keep it keyboard
 * reachable and tell a screen reader what it is. Adding a `useState` for it
 * would be writing what is already there, less well.
 *
 * The summary carries the current values. Folded away without them this would
 * hide the one thing an operator checks before pressing a key — how far the
 * next press moves the machine.
 */
const AxisDrawer = ({
  title, steps, step, onStep, speed, onSpeed, fine, coarse, min, max, disabled,
}) => (
  <details className="group shrink-0 rounded-ctl border border-line bg-surf">
    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
      <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{title}</span>
      <span className="flex-1" />
      <span className="font-num text-note text-mut">
        <span className="text-ink">{step}</span> mm
      </span>
      <span className="font-num text-note text-mut">
        <span className="text-ink">{speed}</span> mm/min
      </span>
      {/* Turns with the drawer, so open and shut is readable without reading. */}
      <span aria-hidden="true" className="text-note text-mut transition-transform group-open:rotate-180">
        &#9662;
      </span>
    </summary>

    <div className="flex flex-col gap-2.5 border-t border-line px-3 py-3">
      <SegmentedChoice
        options={steps}
        value={step}
        onChange={onStep}
        label={`Krok ${title}`}
        unit="mm"
        disabled={disabled}
      />
      <Stepper
        value={speed}
        onChange={onSpeed}
        fine={fine}
        coarse={coarse}
        min={min}
        max={max}
        label={`Prędkość ${title}`}
        disabled={disabled}
      />
    </div>
  </details>
);

export default AxisDrawer;
