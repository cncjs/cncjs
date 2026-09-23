import { useState } from 'react';
import Card from '../ui/Card';
import FadeScroller from '../ui/FadeScroller';
import SegmentedChoice from '../ui/SegmentedChoice';
import ThemeChoice from '../ui/ThemeChoice';
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
 * From the variant decision of 2026-09-21, `theme` now lives on the
 * application tab. `density` and `numFont` are the two still to come, and
 * they belong in the same place — beside the application rather than beside
 * the port.
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

const SettingsScreen = ({ machine }) => {
  const [tab, setTab] = useState('connection');

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
        * The fade that says how much is left is `FadeScroller`, which began
        * here and now belongs to every scroller in the panel.
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
      <FadeScroller>
        <div className="flex min-h-full flex-col">
          {tab === 'connection' ? (
            <ConnectScreen machine={machine} />
          ) : (
            <Card label={t('settings.app')} className="flex-1" bodyClassName="gap-4">
              {/* How the panel looks comes before what it is installed as:
                * it is the one thing on this tab that changes something the
                * operator is looking at while they change it. */}
              <ThemeChoice />
              <span className="h-px bg-line" />
              <AppScreen />
            </Card>
          )}
        </div>
      </FadeScroller>
    </div>
  );
};

export default SettingsScreen;
