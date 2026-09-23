import { useEffect, useState } from 'react';
import { t } from './i18n';
import { FooterSlotProvider } from './ui/footerSlot';
import { ShellNodeProvider, ShellWidthProvider, useIsPhone, useMeasuredShell } from './ui/shell';
import NavRail from './ui/NavRail';
import NavTabs from './ui/NavTabs';
import StatusBar from './ui/StatusBar';
import TopBar from './ui/TopBar';
import StatusSheet from './ui/StatusSheet';
import StateHelp from './ui/StateHelp';
import { applyUpdate, isUpdateReady, watchUpdate } from './machine/update';
import Dashboard from './screens/Dashboard';
import JogScreen from './screens/JogScreen';
import PathScreen from './screens/PathScreen';
import SettingsScreen from './screens/SettingsScreen';
import ZeroScreen from './screens/ZeroScreen';
import { useMachine } from './machine/useMachine';
import { adviceFor } from './machine/advice';
import { emergencyStop } from './machine/commands';

/**
 * Every destination the mockup draws, with `ready` saying which ones exist.
 *
 * The key is written out rather than assembled from the id. Building it is
 * shorter and costs the one thing a resource file has to have: a key that can
 * be grepped for. Nothing would otherwise tell you `nav.probe` is still read
 * by anything.
 *
 * The unbuilt ones are shown and disabled rather than hidden. A rail that
 * grew an item each time a screen was finished would move under the
 * operator's hand between releases, and on a panel beside a machine most of
 * the value is that the thing is always in the same place.
 */
const DESTINATIONS = [
  { id: 'dashboard', key: 'nav.dashboard', ready: true },
  { id: 'jog', key: 'nav.jog', ready: true },
  { id: 'zero', key: 'nav.zero', ready: true },
  { id: 'files', key: 'nav.files', ready: false },
  { id: 'path', key: 'nav.path', ready: true },
  { id: 'probe', key: 'nav.probe', ready: false },
  { id: 'diag', key: 'nav.diag', ready: false },
  { id: 'alarms', key: 'nav.alarms', ready: false },
  { id: 'homing', key: 'nav.homing', ready: false },
  { id: 'mdi', key: 'nav.mdi', ready: false },
  /*
   * Settings last, and the connection inside it.
   *
   * The connection had a destination of its own for a day. Mateusz moved it
   * on 2026-09-23 — *"connection trafia do zakladki ustawienia, ustawienia na
   * samym dole"* — and both halves of that are the same judgement: a
   * connection is chosen once a session and then forgotten, which is what
   * everything else on a settings screen has in common with it, and things
   * chosen once belong at the end of a list you read top to bottom.
   */
  { id: 'settings', key: 'nav.settings', ready: true },
].map((destination) => ({ ...destination, label: t(destination.key) }));

/*
 * What a phone sees without pulling, and what pulling reveals.
 *
 * The bottom row is the drawing's own five — `pulpit`, `jog`, `zero`,
 * `pliki`, `alarmy`. It went to six when the connection arrived, then to four
 * when that turned out to be a tab too many; with the menu drawn as icons the
 * width argument is gone and the drawing's list is the right one again.
 *
 * Everything else is one pull away, in the same grid. Nothing is unreachable
 * from a phone, which is what adding tabs to the bar was trying and failing
 * to buy.
 */
const PHONE_IDS = ['dashboard', 'jog', 'zero', 'files', 'alarms'];
const PHONE_DESTINATIONS = PHONE_IDS
  .map((id) => DESTINATIONS.find((d) => d.id === id))
  .map((d) => (d.id === 'zero' ? { ...d, label: t('nav.zeroShort') } : d));

/*
 * The rest, in the order the rail has them. A grid that reordered itself by
 * some idea of importance would be a second opinion about the rail, and the
 * rail is the one anybody learns.
 */
const PHONE_REST = DESTINATIONS
  .filter((d) => !PHONE_IDS.includes(d.id))
  // `Diagnostyka` is eleven characters in a 78px tile and came out as
  // `DIAGNOSTY…`. The same trade the zeroing tab already makes: the rail says
  // the whole word, the grid says as much of it as fits and means.
  .map((d) => (d.id === 'diag' ? { ...d, label: t('nav.diagShort') } : d));

/*
 * Which component a destination is, for the ones that are anything yet.
 *
 * A lookup rather than the chain of ternaries this was: the third screen is
 * where that stops reading as a condition and starts reading as a list that
 * happens to be written as nested `?:`. The dashboard is not in here because
 * it is also the fallback, and because it is the only screen that navigates.
 */
const SCREENS = {
  jog: JogScreen,
  path: PathScreen,
  zero: ZeroScreen,
  settings: SettingsScreen,
};

const Panel = ({ machine, screen, onScreen }) => {
  const phone = useIsPhone();
  const [footer, setFooter] = useState(null);
  /*
   * What the state chip opens, and what that opens in turn.
   *
   * Two layers rather than one sheet with everything in it: the first is
   * about *this* machine right now and is two lines long, the second is the
   * reference for every state there is. Putting the reference in front of
   * somebody who wants to know why their machine will not move is the thing
   * that made the old inline notes wrong.
   */
  /*
   * Whether a newer panel is waiting, re-read rather than held.
   *
   * `machine/update` owns it, because the event it listens for can fire
   * before any screen is mounted. This only subscribes so the badge appears
   * when it does.
   */
  const [, bumpUpdate] = useState(0);
  useEffect(() => watchUpdate(() => bumpUpdate((n) => n + 1)), []);
  const updateReady = isUpdateReady();

  const [alerting, setAlerting] = useState(false);
  const [helping, setHelping] = useState(false);
  const Screen = SCREENS[screen];

  return (
    <>
      {/*
        * On a phone the identity is only shown when it is a problem.
        *
        * Which controller and which port is setup information: read once, then
        * known. At the panel it costs nothing to keep it in view. On a phone it
        * costs the width between the state and the stop, and the chip beside it
        * already says the machine is answering. Disconnected is different —
        * that is the one thing worth the room, and there is no status bar down
        * there to say it instead.
        */}
      <TopBar
        status={machine.status}
        machine={machine.connected && !phone
          ? [
            { label: t('topbar.controller'), value: machine.type },
            { label: t('topbar.port'), value: machine.port },
          ]
          : []}
        /* Not two more identity lines. The bar's ordinary voice is for facts
         * that do not change while anyone is working; this is the reason
         * nothing on the screen below can be pressed. */
        onStatus={() => setAlerting(true)}
        canStop={machine.connected}
        onStop={emergencyStop}
        updateReady={updateReady}
        onUpdate={applyUpdate}
      />

      <div className="flex min-h-0 flex-1">
        {phone ? null : (
          <NavRail items={DESTINATIONS} current={screen} onSelect={onScreen} />
        )}

        {/* `min-h-0` so this constrains its screen rather than growing to fit
          * it: without it a screen taller than the frame pushes the whole
          * panel open and the page scrolls, instead of the one card that can
          * scroll inside itself doing so.
          *
          * The frame is tighter than the gaps between the cards inside it. On
          * a 390px phone every pixel spent on the margin is one the jog keys
          * do not get, and the edge of the display is already an edge. */}
        {/*
          * On a phone the content runs all the way to the bar and the bar's
          * mound rises into it.
          *
          * It used to stop short, so there was a band of page across the
          * bottom and a wedge of it each side of the mound — the mound was a
          * shape belonging to something the content never touched. Asked for
          * as the mound sitting *in* the card: *"nie chce wycinac garba ale
          * dodac dwa elementy po bokach jako uzupelnienie garba na kontenerze
          * a contentu"*, with a drawing.
          *
          * Two parts, and they are the container and the content separately —
          * which is the whole of what took three wrong attempts to see.
          *
          *   - no bottom padding, so the card's own edge is the bar's edge and
          *     the two are one line;
          *   - `--navEdge` of extra padding *inside* the last card, so what is
          *     in it clears the mound. Without that the mound rides over the
          *     bottom row of controls, and an earlier try that moved the card
          *     without moving its contents sliced a button in half.
          *
          * The last card by selector rather than by a prop threaded through
          * five screens and their widgets: which card is last is a fact about
          * the layout, and the layout is what this element owns.
          */}
        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col p-2.5 ${phone
            ? 'pb-0 [&_section:last-child]:pb-[calc(var(--pad)+var(--navEdge))]'
            : ''}`}
        >
          <FooterSlotProvider value={setFooter}>
            {Screen
              ? <Screen machine={machine} />
              : <Dashboard machine={machine} onGo={onScreen} />}
          </FooterSlotProvider>
        </main>
      </div>

      {alerting ? (
        <StatusSheet
          machine={machine}
          status={machine.status}
          advice={adviceFor(machine)}
          error={machine.error}
          onGo={() => { setAlerting(false); onScreen('settings'); }}
          onHelp={() => { setAlerting(false); setHelping(true); }}
          onClose={() => setAlerting(false)}
        />
      ) : null}

      {helping ? <StateHelp machine={machine} onClose={() => setHelping(false)} /> : null}

      {/* One or the other, never both: on a phone the tab bar is the bottom of
        * the screen and there is no room for a status line as well. */}
      {phone ? (
        <NavTabs
          items={PHONE_DESTINATIONS}
          rest={PHONE_REST}
          current={screen}
          onSelect={onScreen}
          /*
           * Up over the content by the height of its own edge strip.
           *
           * A negative margin on the last item in a column does not move it —
           * the bar stays where it was — it gives the row above the same
           * amount of extra height. So the content grows down behind the
           * strip and the mound, which the bar draws at `z-30`, rises into
           * it. Written as a calc because Tailwind will not negate a bare
           * `var()`; `-mt-navEdge` is a class it never generates.
           */
          className="mt-[calc(-1*var(--navEdge))]"
        />
      ) : (
        <StatusBar
          content={footer}
          job={machine.job}
          error={machine.error}
          canStart={false}
          canPause={false}
        />
      )}
    </>
  );
};

const App = () => {
  const machine = useMachine();
  const [screen, setScreen] = useState('dashboard');
  const shell = useMeasuredShell();

  /*
   * The shell is measured and the width decides the layout, rather than a mode
   * anybody sets. Which navigation fits is a fact about how much room there
   * is, so there is nothing to set wrongly — and putting the panel in a 390px
   * frame makes it the phone panel, because that is what a phone would do with
   * it.
   *
   * No theme state either. The drawing switches theme by attribute on the root
   * and the token sheet answers to it there, so nothing in React needs to know
   * a theme exists — which is what lets it be a setting, and lets the review
   * overlay flip it without fighting a re-render.
   */
  return (
    /*
     * The shell never scrolls, and that is now load-bearing rather than
     * tidy.
     *
     * The phone's menu is one block parked with two of its three rows below
     * the screen, and an overflowing block extends the document: the hidden
     * rows could be scrolled into view with the menu shut — *"na telefonie
     * wlacza sie skorl i jest to zawsze widoczne, nawet jak menu jest
     * collapesd"*. Clipping here rather than on the nav, because when the
     * menu opens those rows travel *up* into the frame and a clip on the nav
     * would cut them off instead.
     *
     * It is also the rule this panel already had: nothing scrolls but the
     * one region that says it does.
     */
    <div ref={shell.ref} className="@container/shell flex h-full flex-col overflow-hidden bg-bg text-ink">
      <ShellWidthProvider value={shell.width}>
        <ShellNodeProvider value={shell.node}>
          <Panel machine={machine} screen={screen} onScreen={setScreen} />
        </ShellNodeProvider>
      </ShellWidthProvider>
    </div>
  );
};

export default App;
