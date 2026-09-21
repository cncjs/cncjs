import controller from './controller';

/**
 * Which `P` number the active work coordinate system is.
 *
 * `G10 L20 P<n>` sets the offset of one specific coordinate system, and `n` is
 * not a free choice — it has to be the one the machine is currently working
 * in, or the operator zeroes a coordinate system they are not using and the
 * tool goes somewhere else on the next move.
 */
const WCS_TO_P = {
  G54: 1,
  G55: 2,
  G56: 3,
  G57: 4,
  G58: 5,
  G59: 6,
};

export const activeWcsNumber = (modal = {}) => WCS_TO_P[modal.wcs] || 0;

/**
 * Set the current position as the work zero for some axes.
 *
 * `G10 L20` moves nothing. It rewrites the offset between machine coordinates
 * and work coordinates so that where the tool is *now* reads as zero — which
 * is what an operator means by "zero it here" after jogging onto the corner of
 * the stock.
 *
 * Returns null rather than guessing when the controller has not said which
 * coordinate system is active. Zeroing the wrong one is worse than not
 * zeroing: it is silent, and it is discovered by a tool moving to the wrong
 * place under power.
 */
export const zeroLine = ({ modal, axes }) => {
  const p = activeWcsNumber(modal);
  if (!p || !axes.length) {
    return null;
  }
  const words = axes.map((axis) => `${axis.toUpperCase()}0`).join(' ');
  return `G10 L20 P${p} ${words}`;
};

export const zero = (params) => {
  const line = zeroLine(params);
  if (line) {
    controller.command('gcode', line);
  }
  return line;
};
