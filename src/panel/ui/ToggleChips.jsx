/**
 * Several things that are each on or off, as opposed to one choice among many.
 *
 * `SegmentedChoice` is the sibling of this and answers a different question —
 * there, exactly one option is chosen and picking another unpicks the first.
 * Here every chip stands alone: the toolpath screen's layers are four
 * independent questions, and an operator comparing a program against the
 * machine's reach wants both of them on at once.
 *
 * Same chip, so the two read as one family of control. `aria-pressed` rather
 * than a checkbox role, because that is what these are — buttons that stay
 * down.
 *
 * A chip that has nothing to show is disabled rather than hidden. "There are
 * no work coordinate systems to draw" is an answer, and a row that changed
 * length as the machine reported things would move under the finger reaching
 * for it.
 */
const ToggleChips = ({ options, value, onChange, label }) => (
  /*
   * The row's height is not fixed, and that is the difference between a
   * wrapping control and a broken one. `h-chiph` here — copied from
   * `SegmentedChoice`, which never wraps because it is one choice — pinned
   * the container to a single row while the chips inside it wrapped to two,
   * so the second row was drawn on top of whatever came next.
   */
  <div className="flex shrink-0 flex-wrap gap-2" role="group" aria-label={label}>
    {options.map((option) => {
      const on = Boolean(value[option.id]) && !option.disabled;
      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={on}
          disabled={option.disabled}
          title={option.note}
          onClick={() => onChange({ ...value, [option.id]: !value[option.id] })}
          className={[
            'h-chiph min-w-0 rounded-ctl border px-4 text-base font-semibold uppercase',
            'tracking-[0.1em] transition-colors',
            on
              ? 'border-acc bg-acc text-white'
              : 'border-line bg-surf text-ink hover:border-acc hover:text-acc',
            'disabled:opacity-45 disabled:hover:border-line disabled:hover:text-ink',
          ].join(' ')}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default ToggleChips;
