/**
 * Where you can go, and where you are.
 *
 * Every destination the mockup draws is here, including the ones with nothing
 * behind them yet — a rail that grew an item each time a screen was finished
 * would move under the operator's hand, and muscle memory is most of what a
 * panel by a machine is for. The ones not built yet are disabled and say so.
 *
 * `aria-current` as well as the fill: colour alone leaves anyone not looking
 * at it unable to tell where they are.
 */
const NavRail = ({ items, current, onSelect, className = '' }) => (
  // The visibility class belongs here rather than on a wrapper. A `div`
  // around this one is `display: block`, and a block box between the rail
  // and the flex row it lives in leaves the rail at the height of its own
  // items — which on a window taller than the items stops it halfway down
  // the screen with bare background beneath.
  <nav
    className={`flex w-rail shrink-0 flex-col border-r border-line bg-panel ${className}`}
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
            'flex h-[58px] shrink-0 items-center px-[14px] text-left text-cap font-semibold uppercase tracking-[0.1em]',
            here ? 'bg-acc text-white' : 'bg-transparent text-mut',
            ready && !here ? 'hover:bg-accS hover:text-acc' : '',
            !ready ? 'opacity-45' : '',
          ].join(' ')}
        >
          {label}
        </button>
      );
    })}
  </nav>
);

export default NavRail;
