/**
 * Where you can go, when there is no room for a rail.
 *
 * The drawing carries this as a separate navigation mode rather than a rail
 * that got narrower, and it is right to: a 132px rail out of 390px of screen
 * is a third of a phone spent on a list of places you are not.
 *
 * Five destinations, not eleven. That is the drawing's own list — `pulpit`,
 * `jog`, `zero`, `pliki`, `alarmy` — and the reduction is the point. A phone is
 * reached for beside the machine to do one of a few things; the rest is work
 * done sitting down, at the panel.
 *
 * A mark above a word, both large enough for a thumb. The bar is `--btnh`
 * tall, which is the panel's own height for a control somebody presses without
 * looking — the same figure the stop uses. A tab bar sized for a mouse is the
 * one part of a phone panel that gets pressed by accident.
 *
 * Unbuilt destinations are still shown and disabled, for the same reason the
 * rail shows them: a bar whose items appear one release at a time moves under
 * a thumb that had stopped looking.
 */

/*
 * A glyph each, because at this size a word is read and a shape is recognised.
 * They are drawn rather than lettered — an icon font is a second download and
 * a second thing to keep, and these five are simple enough to say in a path.
 */
const MARKS = {
  dashboard: 'M3 11l9-8 9 8M5 9.5V20h14V9.5',
  jog: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  zero: 'M12 3v18M3 12h18M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0',
  files: 'M4 4h6l2 3h8v13H4zM4 9h16',
  alarms: 'M12 4a6 6 0 0 0-6 6v4l-2 3h16l-2-3v-4a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0',
};

const NavTabs = ({ items, current, onSelect, className = '' }) => (
  <nav
    className={`flex h-btnh shrink-0 border-t border-line bg-panel ${className}`}
    aria-label="Nawigacja"
  >
    {items.map(({ id, label, ready }) => {
      const here = id === current;
      return (
        <button
          key={id}
          type="button"
          aria-current={here ? 'page' : undefined}
          aria-label={label}
          disabled={!ready}
          onClick={() => onSelect(id)}
          className={[
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1',
            here ? 'text-acc' : 'text-mut',
            !ready ? 'opacity-45' : '',
          ].join(' ')}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-7 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={MARKS[id] || MARKS.files} />
          </svg>
          {/* The word stays under the shape. A glyph alone is a guess until it
            * has been learned, and this bar is used by whoever happens to be
            * standing at the machine. */}
          <span className="truncate text-label font-semibold uppercase tracking-[0.06em]">
            {label}
          </span>
        </button>
      );
    })}
  </nav>
);

export default NavTabs;
