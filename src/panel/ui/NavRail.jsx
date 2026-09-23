import { t } from '../i18n';

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
  /*
   * It fits, and it does not scroll.
   *
   * Eleven items at 58px is 638px, and between the top bar and the status
   * line there are about 615 — so the last one hung *under* the status bar
   * and could not be clicked. It went unnoticed while the bottom of the list
   * was `MDI`, a destination that does not exist yet; it surfaced the day
   * `Ustawienia` moved down there and Playwright reported the footer
   * intercepting the click.
   *
   * A scroller was the first answer and the wrong one: *"menu nie moze sie
   * skrolowac"*. A list of places you can go is not something to hunt
   * through, and a destination you have to scroll to is one that is not
   * really on the rail.
   *
   * So the items share what there is. `58px` is a ceiling rather than a
   * height — they keep the drawn size wherever it fits and give way together
   * where it does not, which on a 720p window is three pixels each.
   *
   * **If the list grows much past this**, the answer is not smaller rows:
   * *"jesli bedzie ich duzo to mozna zrobic podbna rozwizanie jak na mobiel,
   * czyli rozwijanie w bok"* — the phone's menu, turned on its side.
   */
  <nav
    className={`flex min-h-0 w-rail shrink-0 flex-col border-r border-line bg-panel ${className}`}
    aria-label={t('nav.label')}
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
            'flex min-h-0 max-h-[58px] flex-1 items-center px-[14px] text-left text-cap font-semibold uppercase tracking-[0.1em]',
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
