import styles from './Rail.module.css';

/**
 * Where you can go, and where you are.
 *
 * `aria-current` as well as the fill: marking the current destination with
 * colour alone leaves anyone not looking at it unable to tell where they are.
 *
 * The mockup draws six destinations. It gets the ones that exist — the tabs on
 * the drawing are illustrative and nobody has asked for that navigation.
 */
const Rail = ({ items, current, onSelect }) => (
  <nav className={styles.rail} aria-label="Main navigation">
    {items.map(({ id, label }) => (
      <button
        key={id}
        type="button"
        className={`${styles.item} ${id === current ? styles.current : ''}`}
        aria-current={id === current ? 'page' : undefined}
        onClick={() => onSelect(id)}
      >
        {label}
      </button>
    ))}
  </nav>
);

export default Rail;
