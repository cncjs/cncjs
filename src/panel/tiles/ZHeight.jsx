import Tile from '../ui/Tile';
import { formatPosition, NO_READING } from '../machine/readings';
import { zero, activeWcsNumber } from '../machine/zero';
import styles from './ZHeight.module.css';

/**
 * How far the tool is above the work, and the two things done about it.
 *
 * Zeroing moves nothing: `G10 L20` rewrites the offset between machine and
 * work coordinates so that where the tool is now reads as zero. That is what
 * an operator means after jogging down onto the corner of the stock.
 *
 * Both buttons are dead unless the controller has said which coordinate
 * system is active, because `G10 L20` has to name one and a guess is the kind
 * of mistake that is only discovered by a tool moving to the wrong place under
 * power.
 */
const ZHeight = ({ position, machinePosition, modal, connected }) => {
  const canZero = connected && activeWcsNumber(modal) > 0;
  const machineZ = formatPosition(machinePosition.z);

  return (
    <Tile
      title="Z height"
      aside={machineZ === NO_READING ? null : `mach. ${machineZ} mm`}
    >
      <div className={styles.reading}>
        <span className={styles.value}>{formatPosition(position.z)}</span>
        <span className={styles.unit}>mm</span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          disabled={!canZero}
          onClick={() => zero({ modal, axes: ['z'] })}
        >
          Zero Z
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.secondary}`}
          disabled={!canZero}
          onClick={() => zero({ modal, axes: ['x', 'y'] })}
        >
          Zero XY
        </button>
      </div>
    </Tile>
  );
};

export default ZHeight;
