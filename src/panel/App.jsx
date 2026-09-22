import { useState } from 'react';
import { t } from './i18n';
import { FooterSlotProvider } from './ui/footerSlot';
import { ShellWidthProvider, useIsPhone, useMeasuredShell } from './ui/shell';
import NavRail from './ui/NavRail';
import NavTabs from './ui/NavTabs';
import StatusBar from './ui/StatusBar';
import TopBar from './ui/TopBar';
import Dashboard from './screens/Dashboard';
import JogScreen from './screens/JogScreen';
import PathScreen from './screens/PathScreen';
import { useMachine } from './machine/useMachine';
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
  { id: 'zero', key: 'nav.zero', ready: false },
  { id: 'files', key: 'nav.files', ready: false },
  { id: 'path', key: 'nav.path', ready: true },
  { id: 'probe', key: 'nav.probe', ready: false },
  { id: 'diag', key: 'nav.diag', ready: false },
  { id: 'alarms', key: 'nav.alarms', ready: false },
  { id: 'settings', key: 'nav.settings', ready: false },
  { id: 'homing', key: 'nav.homing', ready: false },
  { id: 'mdi', key: 'nav.mdi', ready: false },
].map((destination) => ({ ...destination, label: t(destination.key) }));

/*
 * What a phone gets: five of the eleven, and the drawing's own five.
 *
 * The reduction is the point rather than a limitation of the bar. A phone
 * is picked up beside the machine to do one of a few things; settings,
 * diagnostics and MDI are work done sitting at the panel.
 */
const PHONE_IDS = ['dashboard', 'jog', 'zero', 'files', 'alarms'];
const PHONE_DESTINATIONS = PHONE_IDS
  .map((id) => DESTINATIONS.find((d) => d.id === id))
  .map((d) => (d.id === 'zero' ? { ...d, label: t('nav.zeroShort') } : d));

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
};

const Panel = ({ machine, screen, onScreen }) => {
  const phone = useIsPhone();
  const [footer, setFooter] = useState(null);
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
        warning={machine.connected ? null : t('topbar.disconnected')}
        canStop={machine.connected}
        onStop={emergencyStop}
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
        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-2.5">
          <FooterSlotProvider value={setFooter}>
            {Screen
              ? <Screen machine={machine} />
              : <Dashboard machine={machine} onGo={onScreen} />}
          </FooterSlotProvider>
        </main>
      </div>

      {/* One or the other, never both: on a phone the tab bar is the bottom of
        * the screen and there is no room for a status line as well. */}
      {phone ? (
        <NavTabs items={PHONE_DESTINATIONS} current={screen} onSelect={onScreen} />
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
    <div ref={shell.ref} className="@container/shell flex h-full flex-col bg-bg text-ink">
      <ShellWidthProvider value={shell.width}>
        <Panel machine={machine} screen={screen} onScreen={setScreen} />
      </ShellWidthProvider>
    </div>
  );
};

export default App;
