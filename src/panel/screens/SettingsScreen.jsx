import { useCallback, useEffect, useState } from 'react';
import Card from '../ui/Card';
import SegmentedChoice from '../ui/SegmentedChoice';
import ConnectScreen from './ConnectScreen';
import AppScreen from './AppScreen';
import { t } from '../i18n';

/**
 * Everything that is set once and then left alone.
 *
 * Which machine the panel is talking to was the first of those, and it had
 * this screen to itself for a day. The second is the panel as a *thing on a
 * phone* — installed or not, trusted or not — which is settings by the same
 * test: decided once, and then never thought about again.
 *
 * **Tabs rather than two cards stacked.** They have nothing to do with each
 * other, and on a 390px screen a second card below the first is a card nobody
 * scrolls to. `SegmentedChoice` is the panel's own control for a choice among
 * a few fixed things, and a pair of sections is exactly that.
 *
 * What lands here next is decided and not built: `theme`, `density` and
 * `numFont`, from the variant decision of 2026-09-21. They belong beside the
 * application rather than beside the port.
 */

/*
 * Each tab's key written out, not built from its id.
 *
 * `t(`settings.${id}`)` would be shorter and would be a key nothing can grep
 * for — the resources test looks for quoted dotted literals, so both would
 * read as keys nobody asks for and a misspelling would reach an operator.
 * Same reason the rail writes `nav.jog` out instead of assembling it.
 */
const LABELS = {
  connection: 'settings.connection',
  app: 'settings.app',
};

const TABS = Object.keys(LABELS);

/*
 * Which edges of the scroller have something hidden behind them.
 *
 * Both fades are conditional, and each for its own reason. A permanent top
 * fade would wash out the first row of a section nobody has scrolled yet --
 * *"ten fade od gory tez przy skorlu"*, at the scroll, not before it. And a
 * permanent bottom one would hide the very thing the bottom padding was added
 * to show: the end of the section, reached.
 *
 * A pixel of slack on each comparison. `scrollTop` is fractional on a phone
 * with a scaled viewport, so `> 0` is true at rest and the top would fade by
 * a hair on a screen nobody had touched.
 */
const edgesOf = (el) => (el ? {
  top: el.scrollTop > 1,
  bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
} : { top: false, bottom: false });

const SettingsScreen = ({ machine }) => {
  const [tab, setTab] = useState('connection');
  const [scroller, setScroller] = useState(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => setEdges(edgesOf(scroller)), [scroller]);

  /*
   * Measured on arrival and whenever the content changes height, not only on
   * scroll: switching tabs swaps a short section for a tall one without
   * anybody scrolling, and a bottom fade that only appears after the first
   * drag is a fade that says "there is more" one gesture too late.
   */
  useEffect(() => {
    if (!scroller) {
      return undefined;
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    Array.from(scroller.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [scroller, measure, tab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <SegmentedChoice
        label={t('nav.settings')}
        options={TABS}
        value={tab}
        onChange={setTab}
        format={(id) => t(LABELS[id])}
      />

      {/*
        * The screen scrolls, not the card.
        *
        * It was the other way round and it read badly on a phone: a section
        * with its own scrollbar inside a frame that does not move, so the
        * warning and the certificate below it were a second, hidden document
        * -- *"czy da sie zrobic zeby sekcja sie nie skorlowala byla
        * rozwnieta"* (2026-09-23). Expanded, the card is simply as tall as it
        * needs to be and the whole thing travels past the menu.
        *
        * The mask is the fade: content thinning out as it runs under the bar
        * rather than being cut off at a hard edge. A mask and not a coloured
        * gradient, because the strip passes over the white card *and* the
        * grey behind it, and one colour cannot be right on both.
        *
        * Its two stops are custom properties rather than an inline style, so
        * the whole thing stays a class and the panel keeps its rule about
        * hand-written style attributes. At `0px` the gradient has a
        * zero-length ramp, which is the same as no mask at all.
        *
        * `min-h-full` on the inner column keeps the short case honest: the
        * connection tab pushes its buttons down with a spacer, which needs a
        * height to push against.
        *
        * No padding of its own below that. There was a `pb-5` here for a few
        * minutes, on a misreading -- *"tutaj nie musi byc dodatkowgo
        * paddingu, moze zle sie wyrazilem, staly wokolo calej sekcji"*. The
        * section already has one, the same on all four sides, and a second
        * one under it only made the bottom different from the rest.
        */}
      <div
        ref={setScroller}
        onScroll={measure}
        className={[
          'min-h-0 flex-1 overflow-y-auto',
          '[mask-image:linear-gradient(to_bottom,transparent_0,black_var(--fadeT),black_calc(100%-var(--fadeB)),transparent_100%)]',
          edges.top ? '[--fadeT:1.75rem]' : '[--fadeT:0px]',
          edges.bottom ? '[--fadeB:1.75rem]' : '[--fadeB:0px]',
        ].join(' ')}
      >
        <div className="flex min-h-full flex-col">
          {tab === 'connection' ? (
            <ConnectScreen machine={machine} />
          ) : (
            <Card label={t('settings.app')} className="flex-1" bodyClassName="gap-4">
              <AppScreen />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
