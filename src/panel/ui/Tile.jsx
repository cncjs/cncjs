import styles from './Tile.module.css';

/**
 * A titled panel.
 *
 * It takes its size from whatever holds it and assumes nothing about whether
 * that is a grid cell, a column or a whole screen. `aside` is the quiet note
 * some tiles carry in the header — a machine coordinate, a file name — which
 * the mockup draws right-aligned against the title.
 */
const Tile = ({ title, aside, children }) => (
  <section className={styles.tile}>
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {aside ? <span className={styles.aside}>{aside}</span> : null}
    </header>
    <div className={styles.body}>{children}</div>
  </section>
);

export default Tile;
