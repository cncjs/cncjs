import Bar from './ui/Bar';
import Rail from './ui/Rail';
import Status from './ui/Status';
import Jog from './tiles/Jog';
import WorkPosition from './tiles/WorkPosition';
import ZHeight from './tiles/ZHeight';
import { useMachine } from './machine/useMachine';
import { emergencyStop } from './machine/commands';
import styles from './App.module.css';

// Only the destination that exists. The mockup draws six and its own caption
// calls the tabs illustrative.
const DESTINATIONS = [{ id: 'panel', label: 'Panel' }];

const App = () => {
  const machine = useMachine();

  return (
    <div className={styles.app}>
      <Bar
        className={styles.bar}
        status={machine.status}
        note={machine.port ? `${machine.type} · ${machine.port}` : null}
        canStop={machine.connected}
        onStop={emergencyStop}
      />
      <Rail items={DESTINATIONS} current="panel" onSelect={() => {}} />
      <main className={styles.field}>
        {machine.error ? (
          <p className={styles.notice}>{machine.error}</p>
        ) : null}
        <ZHeight
          position={machine.position}
          machinePosition={machine.machinePosition}
          modal={machine.modal}
          connected={machine.connected}
        />
        <WorkPosition position={machine.position} />
        <div className={styles.wide}>
          <Jog type={machine.type} connected={machine.connected} />
        </div>
      </main>
      <Status
        className={styles.status}
        message={machine.connected ? `${machine.type} ready on ${machine.port}` : 'No machine connected'}
        canStart={false}
      />
    </div>
  );
};

export default App;
