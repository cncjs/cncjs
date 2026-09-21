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
 * Unbuilt destinations are still shown and disabled, for the same reason the
 * rail shows them: a bar whose items appear one release at a time moves under
 * a thumb that had stopped looking.
 */
const NavTabs = ({ items, current, onSelect }) => (
  <nav
    className="flex shrink-0 border-t border-line bg-panel"
    aria-label="Nawigacja"
  >
    {items.map(({ id, label, ready }) => {
      const here = id === current;
      return (
        <button
          key={id}
          type="button"
          aria-current={here ? 'page' : undefined}
          disabled={!ready}
          onClick={() => onSelect(id)}
          className={[
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2',
            'text-cap font-semibold uppercase tracking-[0.06em]',
            here ? 'text-acc' : 'text-mut',
            !ready ? 'opacity-45' : '',
          ].join(' ')}
        >
          {/* The mark sits above the label rather than behind it: a filled tab
            * on a phone is a large block of colour at the bottom of a screen
            * whose subject is a machine position. */}
          <span className={`h-[3px] w-6 rounded-full ${here ? 'bg-acc' : 'bg-transparent'}`} />
          <span className="truncate">{label}</span>
        </button>
      );
    })}
  </nav>
);

export default NavTabs;
