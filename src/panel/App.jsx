import { useState } from 'react';
import NavRail from './ui/NavRail';
import StatusBar from './ui/StatusBar';
import TopBar from './ui/TopBar';
import Dashboard from './screens/Dashboard';
import JogScreen from './screens/JogScreen';
import { useMachine } from './machine/useMachine';
import { emergencyStop } from './machine/commands';
import { NO_READING } from './machine/readings';

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

const App = () => {
  const machine = useMachine();
  const [screen, setScreen] = useState('dashboard');
  const [theme, setTheme] = useState('light');

  // The mockup switches theme, density, target and number face by attribute on
  // the root. Keeping that shape means the token sheet does the work and no
  // component knows a theme exists.
  const shell = (
    <div className="flex h-full flex-col bg-bg text-ink" data-theme={theme}>
      <TopBar
        status={machine.status}
        file={machine.job ? machine.job.name : NO_READING}
        note={machine.job ? `wczytany, ${machine.job.received > 0 ? 'w toku' : 'nie uruchomiony'}` : null}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        canStop={machine.connected}
        onStop={emergencyStop}
      />

      <div className="flex min-h-0 flex-1">
        <NavRail items={DESTINATIONS} current={screen} onSelect={setScreen} />
        <main className="flex min-w-0 flex-1 flex-col gap-gap p-gap">
          {screen === 'jog'
            ? <JogScreen machine={machine} />
            : <Dashboard machine={machine} onGo={setScreen} />}
        </main>
      </div>

      <StatusBar
        message={machine.connected
          ? `${machine.type} · ${machine.port} · układ ${machine.modal.wcs || NO_READING}`
          : 'Brak połączenia ze sterownikiem'}
        error={machine.error}
        canStart={false}
      />
    </div>
  );

  return shell;
};

export default App;
