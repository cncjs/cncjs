import { useState } from 'react';
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

const App = () => {
  const machine = useMachine();
  const [screen, setScreen] = useState('dashboard');

  /*
   * The shell lays itself out from its own width, exactly as every widget in
   * here does.
   *
   * No theme state. The drawing switches theme by attribute on the root and
   * the token sheet answers to it there, so nothing in React needs to know a
   * theme exists — which is what lets it be a setting, and lets the review
   * overlay flip it without fighting a re-render.
   *
   * The drawing keeps two separate switches for this — a `target` that moves
   * the tokens and a `navMode` of rail or tabs — and setting only the first is
   * what makes a phone-sized frame look broken: the rail is still 132px of a
   * 390px screen. The two are not really independent, though. Which navigation
   * fits is a fact about how much room there is, so here the width decides and
   * there is no mode to set wrongly.
   *
   * That also makes previewing honest. Put the panel in a 390px frame and it
   * becomes the phone panel, because that is what a phone would do with it —
   * rather than showing the desk layout at the phone's token sizes, which is a
   * picture of nothing.
   *
   * `@3xl` is 768px: below it the rail and the status line both cost more
   * width and height than they return.
   *
   * The container is named, because a widget deep inside needs to know which
   * shell it is in and not merely how wide its own card is. The readout is
   * the case: a 350px card on a phone and a 364px card on the jog screen are
   * the same width and want opposite arrangements, and only the shell can
   * tell them apart.
   */
  const shell = (
    <div className="@container/shell flex h-full flex-col bg-bg text-ink">
      <TopBar
        status={machine.status}
        machine={machine.connected
          ? [{ label: 'sterownik', value: machine.type }, { label: 'port', value: machine.port }]
          : [{ value: 'Brak połączenia' }, { value: 'ze sterownikiem' }]}
        canStop={machine.connected}
        onStop={emergencyStop}
      />

      <div className="flex min-h-0 flex-1">
        <NavRail
          items={DESTINATIONS}
          current={screen}
          onSelect={setScreen}
          className="hidden @3xl/shell:flex"
        />
        {/* `min-h-0` so this constrains its screen rather than growing to
          * fit it. Without it a screen taller than the frame pushes the
          * whole panel open and the page scrolls, instead of the one card
          * that can scroll inside itself doing so. */}
        {/* The frame round the screen, tighter than the gaps between the
          * cards inside it. On a 390px phone every pixel spent on the
          * margin is one the jog keys do not get, and the edge of the
          * display is already an edge — it does not need repeating. No
          * `gap` here: this holds one screen. */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-2.5">
          {screen === 'jog'
            ? <JogScreen machine={machine} />
            : <Dashboard machine={machine} onGo={setScreen} />}
        </main>
      </div>

      {/* Narrow, the tab bar is the bottom of the screen and there is no room
        * for a status line as well; what it says moves into the bar above. */}
      <NavTabs
        items={PHONE_DESTINATIONS}
        current={screen}
        onSelect={setScreen}
        className="@3xl/shell:hidden"
      />
      <StatusBar
        job={machine.job}
        error={machine.error}
        canStart={false}
        canPause={false}
        className="hidden @3xl/shell:flex"
      />
    </div>
  );

  return shell;
};

export default App;
