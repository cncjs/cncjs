import { useState } from 'react';
import Tile from '../ui/Tile';
import { jog, XY_STEPS, Z_STEPS, FEEDRATES } from '../machine/jog';
import styles from './Jog.module.css';

const KEYS = [
  { area: 'yp', axis: 'y', sign: 1, label: 'Y+' },
  { area: 'xm', axis: 'x', sign: -1, label: 'X−' },
  { area: 'xp', axis: 'x', sign: 1, label: 'X+' },
  { area: 'ym', axis: 'y', sign: -1, label: 'Y−' },
];

const Choice = ({ values, chosen, onChoose, format, disabled, width }) => values.map((value) => (
  <button
    key={value}
    type="button"
    className={`${styles.choice} ${styles[width]} ${value === chosen ? styles.chosen : ''}`}
    aria-pressed={value === chosen}
    disabled={disabled}
    onClick={() => onChoose(value)}
  >
    {format(value)}
  </button>
));

/**
 * Moving the machine by hand.
 *
 * XY and Z have separate step sizes, as the mockup draws them: the depth of
 * cut is chosen in a different order of magnitude from the position on the
 * bed, and one shared step means an operator who wants 10mm across also gets
 * 10mm down.
 *
 * Every control is disabled when nothing is connected. A jog key that looks
 * pressable and silently does nothing teaches an operator that jog keys
 * sometimes do nothing, which is the last thing to believe about a machine.
 */
const Jog = ({ type, connected }) => {
  const [xyStep, setXyStep] = useState(1);
  const [zStep, setZStep] = useState(1);
  const [feedrate, setFeedrate] = useState(1500);

  const move = (axis, sign, step) => jog({
    type,
    axis,
    distance: sign * step,
    feedrate,
  });

  return (
    <Tile title="Jog" aside="incremental">
      <div className={styles.layout}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>XY axes</span>
          <div className={styles.keypad}>
            {KEYS.map(({ area, axis, sign, label }) => (
              <button
                key={area}
                type="button"
                className={`${styles.key} ${styles[area]}`}
                disabled={!connected}
                onClick={() => move(axis, sign, xyStep)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>XY step</span>
          <div className={styles.column}>
            <Choice
              values={XY_STEPS}
              chosen={xyStep}
              onChoose={setXyStep}
              format={(value) => `${value} mm`}
              width="step"
              disabled={!connected}
            />
          </div>
        </div>

        <span className={styles.rule} />

        <div className={styles.group}>
          <span className={styles.groupLabel}>Z axis</span>
          <div className={styles.column}>
            <button
              type="button"
              className={styles.key}
              disabled={!connected}
              onClick={() => move('z', 1, zStep)}
            >
              Z+
            </button>
            <button
              type="button"
              className={styles.key}
              disabled={!connected}
              onClick={() => move('z', -1, zStep)}
            >
              Z&minus;
            </button>
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Z step</span>
          <div className={styles.column}>
            <Choice
              values={Z_STEPS}
              chosen={zStep}
              onChoose={setZStep}
              format={(value) => `${value} mm`}
              width="step"
              disabled={!connected}
            />
          </div>
        </div>

        <span className={styles.rule} />

        <div className={styles.group}>
          <span className={styles.groupLabel}>Jog speed</span>
          <div className={styles.column}>
            <Choice
              values={FEEDRATES}
              chosen={feedrate}
              onChoose={setFeedrate}
              format={(value) => `${value} mm/min`}
              width="speed"
              disabled={!connected}
            />
          </div>
        </div>
      </div>
    </Tile>
  );
};

export default Jog;
