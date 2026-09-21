import controller from './controller';

/**
 * How long the hold is given to take effect before the reset lands.
 *
 * NOT MEASURED. Too short and the reset arrives while the axes are still
 * decelerating, which is the same as not holding at all; too long and an
 * operator who has just hit the big red button watches the tool keep moving.
 * Grbl decelerates a feed hold at the axis rates in `$120`-`$122`, so the
 * right value is a property of the machine. Time a hold from a rapid once the
 * mechanics are attached and set this from what is seen.
 */
const HOLD_BEFORE_RESET = 500;

/**
 * The big red button. Feed hold first, soft reset after.
 *
 * Reset alone stops just as fast but stops by abandoning the motion planner:
 * on a machine at feed rate that is a stop with unknown position afterwards.
 * A hold alone is recoverable and therefore not a stop at all — Cycle Start
 * resumes it. Chosen by Mateusz on 2026-09-20.
 */
export const emergencyStop = () => {
  controller.command('feedhold');
  setTimeout(() => {
    controller.command('reset');
  }, HOLD_BEFORE_RESET);
};

export default emergencyStop;
