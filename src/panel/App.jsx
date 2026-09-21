import { useState } from 'react';
import { FooterSlotProvider } from './ui/footerSlot';
import { ShellWidthProvider, useIsPhone, useMeasuredShell } from './ui/shell';
import NavRail from './ui/NavRail';
import NavTabs from './ui/NavTabs';
import StatusBar from './ui/StatusBar';
import TopBar from './ui/TopBar';
import Dashboard from './screens/Dashboard';
import JogScreen from './screens/JogScreen';
import { useMachine } from './machine/useMachine';
import { emergencyStop } from './machine/commands';

/**
 * Every destination the mockup draws, with `ready` saying which ones exist.
 *
 * The unbuilt ones are shown and disabled rather than hidden. A rail that
 * grew an item each time a screen was finished would move under the
 * operator's hand between releases, and on a panel beside a machine most of
 * the value is that the thing is always in the same place.
 */
const DESTINATIONS = [
  { id: 'dashboard', label: 'Pulpit', ready: true },
  { id: 'jog', label: 'Jog', ready: true },
  { id: 'zero', label: 'Zerowanie', ready: false },
  { id: 'files', label: 'Pliki', ready: false },
  { id: 'path', label: 'Ścieżka', ready: false },
  { id: 'probe', label: 'Sonda', ready: false },
  { id: 'diag', label: 'Diagnostyka', ready: false },
  { id: 'alarms', label: 'Alarmy', ready: false },
  { id: 'settings', label: 'Ustawienia', ready: false },
  { id: 'homing', label: 'Bazowanie', ready: false },
  { id: 'mdi', label: 'MDI', ready: false },
];

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
  .map((d) => (d.id === 'zero' ? { ...d, label: 'Zero' } : d));

const Panel = ({ machine, screen, onScreen }) => {
  const phone = useIsPhone();
  const [footer, setFooter] = useState(null);

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
        machine={machine.connected
          ? (phone
? []
: [
            { label: 'sterownik', value: machine.type },
            { label: 'port', value: machine.port },
          ])
          : [{ value: 'Brak połączenia' }, { value: 'ze sterownikiem' }]}
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
            {screen === 'jog'
              ? <JogScreen machine={machine} />
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
