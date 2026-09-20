import styles from './Tile.module.css';

/**
 * A region of the panel.
 *
 * `title` is the quiet grey label at the top left; `aside` is the mono note at
 * the top right, which in the mockup carries a second reading — a machine
 * coordinate beside a work coordinate, a probe's contact state beside its
 * settings.
 *
 * It takes its size from whatever holds it and assumes nothing about whether
 * that is a grid cell, a column or a whole screen.
 */
const Tile = ({ title, aside, children }) => (
  <section className={styles.tile}>
    <header className={styles.head}>
      <h2 className={styles.label}>{title}</h2>
      {aside ? <span className={styles.note}>{aside}</span> : null}
    </header>
    <div className={styles.body}>{children}</div>
  </section>
);

export default Tile;
