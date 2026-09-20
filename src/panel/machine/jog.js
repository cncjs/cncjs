import controller from './controller';

const GRBL = 'Grbl';
const SMOOTHIE = 'Smoothie';

/** What the mockup offers, in the order it offers it. */
export const XY_STEPS = [0.1, 1, 10];
export const Z_STEPS = [0.1, 1, 5];
export const FEEDRATES = [500, 1500, 3000];

/**
 * The lines that move one axis by one step.
 *
 * Returned rather than sent, so the decision can be tested without a machine
 * and without mocking time. Sending is `jog()` below and is three lines long.
 *
 * **Grbl gets `$J=`, and that is not a detail.** The old application jogs with
 * `G91` / `G0` / `G90`, which has three problems on a machine: `G0` is a rapid,
 * so the jog speed the mockup lets an operator choose would be ignored; the
 * modal state is changed and changed back, so a jog interrupted between those
 * two lines leaves the machine in relative mode; and it cannot be cancelled —
 * once the move is in the planner it runs to the end. `$J=` is Grbl 1.1's
 * jogging command: it carries its own feed rate, leaves the modal state alone,
 * and is cancelled by `jogCancel` (0x85).
 *
 * `G21` is on the line on purpose. The distance is in millimetres whatever the
 * machine's current units happen to be, so a panel showing mm cannot send
 * inches.
 *
 * Anything that is not Grbl or Smoothie gets the old dance, with `G1` and a
 * feed rate rather than `G0` — at least the chosen speed is honoured. Marlin
 * and TinyG have their own jogging and neither is implemented here, which is
 * recorded in the panel's README rather than guessed at.
 */
export const jogLines = ({ type, axis, distance, feedrate }) => {
  const word = `${axis.toUpperCase()}${distance}`;

  if (type === GRBL || type === SMOOTHIE) {
    return [`$J=G91 G21 ${word} F${feedrate}`];
  }

  return ['G91', `G1 ${word} F${feedrate}`, 'G90'];
};

/** Move one axis by one step. */
export const jog = (params) => {
  jogLines(params).forEach((line) => {
    controller.command('gcode', line);
  });
};

/**
 * Stop a jog that is already running.
 *
 * Only Grbl has this. On anything else the move is in the planner and runs to
 * the end, which is the honest answer rather than a button that pretends.
 */
export const jogCancel = (type) => {
  if (type === GRBL) {
    controller.command('jogCancel');
  }
};
