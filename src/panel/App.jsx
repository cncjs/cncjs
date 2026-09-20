import Bar from './ui/Bar';
import Rail from './ui/Rail';
import WorkPosition from './tiles/WorkPosition';
import { useMachine } from './machine/useMachine';
import { emergencyStop } from './machine/commands';
import styles from './App.module.css';

// Only the destination that exists. The mockup's other five are illustrative.
const DESTINATIONS = [{ id: 'panel', label: 'Panel' }];

const App = () => {
  const machine = useMachine();

  return (
    <div className={styles.app}>
      <Bar
        status={machine.status}
        note={machine.port ? `${machine.type} · ${machine.port}` : null}
        canStop={machine.connected}
        onStop={emergencyStop}
      />
      <div className={styles.body}>
        <Rail items={DESTINATIONS} current="panel" onSelect={() => {}} />
        <main className={styles.field}>
          {machine.error ? (
            <p className={styles.notice}>
              {machine.error}
            </p>
          ) : null}
          <WorkPosition position={machine.position} />
        </main>
      </div>
    </div>
  );
};

export default App;
