import Tile from '../ui/Tile';
import { formatPosition } from '../machine/readings';
import styles from './WorkPosition.module.css';

const AXES = ['x', 'y', 'z'];

/**
 * Where the tool is, in work coordinates.
 *
 * Work rather than machine, because work coordinates are what a job is cut in
 * — the machine position only matters when homing or when something is wrong,
 * and the mockup puts it in the header as a quiet note rather than as a
 * reading.
 *
 * Every axis shows a dash until the controller has said otherwise. A zero
 * there would be a claim: on an unhomed machine "0.000" and "we have not been
 * told" are very different statements and only one of them is safe to act on.
 */
const WorkPosition = ({ position }) => (
  <Tile title="Work position">
    {AXES.map((axis) => (
      <div className={styles.axis} key={axis}>
        <span className={styles.label}>{axis.toUpperCase()}</span>
        <span className={styles.value}>{formatPosition(position[axis])}</span>
        <span className={styles.unit}>mm</span>
      </div>
    ))}
  </Tile>
);

export default WorkPosition;
