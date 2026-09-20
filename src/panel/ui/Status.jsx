import styles from './Status.module.css';

/**
 * The bottom line: what just happened, and the way to start work.
 *
 * `Start job` is disabled until there is a job to start, and that is not
 * politeness. On a machine the difference between "nothing loaded" and
 * "loaded and waiting" is the difference between pressing this and watching
 * nothing happen, and a button that sometimes does nothing is one nobody
 * trusts when it matters.
 */
const Status = ({ message, canStart, onStart, className = '' }) => (
  <div className={`${styles.status} ${className}`}>
    <span className={styles.message}>{message}</span>
    <button
      type="button"
      className={styles.start}
      disabled={!canStart}
      onClick={onStart}
    >
      Start job
    </button>
  </div>
);

export default Status;
