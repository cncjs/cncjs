import styles from './StateChip.module.css';

/**
 * What state a machine is in.
 *
 * `tone` says how to colour it — `running`, `ready`, `stopped` or `inactive` —
 * and `children` is the word. The chip does not know what a Grbl state is
 * called, which is what lets the same component say "Idle" on a controller
 * panel and something else in the top bar.
 */
const StateChip = ({ tone = 'inactive', children }) => (
  <span className={`${styles.chip} ${styles[tone] || ''}`}>
    <span className={styles.dot} aria-hidden="true" />
    <span className={styles.word}>{children}</span>
  </span>
);

export default StateChip;
