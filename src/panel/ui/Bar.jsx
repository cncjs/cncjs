import StateChip from './StateChip';
import styles from './Bar.module.css';

/**
 * The top bar: what the machine is doing, and the way to make it stop.
 *
 * The chip is first because it is the first thing anyone looks at — it answers
 * "is it moving" before any control on the screen is read.
 *
 * The stop is disabled when nothing is connected. A button that cannot reach a
 * machine should not look like one that can: the alternative is an operator
 * pressing it, seeing nothing happen, and learning that it sometimes does
 * nothing.
 */
const Bar = ({ status, note, onStop, canStop, className = '' }) => (
  <nav className={`${styles.bar} ${className}`} aria-label="Machine bar">
    <StateChip tone={status.tone}>{status.word}</StateChip>
    {note ? <span className={styles.note}>{note}</span> : null}
    <button
      type="button"
      className={styles.stop}
      onClick={onStop}
      disabled={!canStop}
    >
      Stop
    </button>
  </nav>
);

export default Bar;
