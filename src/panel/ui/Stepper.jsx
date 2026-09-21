/**
 * A number nudged up and down, with a coarse step either side of a fine one.
 *
 * The mockup gives the jog speed this shape rather than a list of fixed
 * values, and the reason shows on a machine: the speed an operator wants is
 * whatever keeps the cutter sounding right, and that is found by moving
 * towards it rather than by picking from three.
 *
 * Four buttons, not two, because the useful range spans an order of
 * magnitude: « and » cover it, ‹ and › land on it.
 *
 * Laid out as `auto auto 1fr auto auto` so the keys keep their size and the
 * reading absorbs the rest — at any width, and without the reading's own text
 * holding the row open and pushing the outer keys off the card.
 */
// Declared outside `Stepper` on purpose: a component defined during render is
// a new type on every render, and React throws away the subtree rather than
// updating it.
const Key = ({ delta, label, disabled, onStep, children }) => (
  <button
    type="button"
    disabled={disabled}
    aria-label={`${label} ${delta > 0 ? '+' : ''}${delta}`}
    onClick={() => onStep(delta)}
    className="h-full w-11 rounded-ctl border border-line bg-surf font-num text-base text-mut hover:border-acc hover:text-acc disabled:opacity-45 disabled:hover:border-line disabled:hover:text-mut"
  >
    {children}
  </button>
);

const Stepper = ({ value, onChange, fine, coarse, min, max, label, unit, disabled }) => {
  const step = (delta) => onChange(Math.max(min, Math.min(max, value + delta)));
  const key = { label, disabled, onStep: step };

  return (
    <div
      className="grid h-chiph shrink-0 grid-cols-[auto_auto_1fr_auto_auto] gap-2"
      role="group"
      aria-label={label}
    >
      <Key {...key} delta={-coarse}>&laquo;</Key>
      <Key {...key} delta={-fine}>&lsaquo;</Key>
      <output className="flex h-full min-w-0 items-center justify-center rounded-ctl border border-line bg-field font-num text-lead font-semibold tabular-nums text-ink">
        {value}
        {unit ? <span className="ml-1 text-note font-normal text-mut">{unit}</span> : null}
      </output>
      <Key {...key} delta={fine}>&rsaquo;</Key>
      <Key {...key} delta={coarse}>&raquo;</Key>
    </div>
  );
};

export default Stepper;
