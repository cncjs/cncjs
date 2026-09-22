import controller from './controller';
import { machineEnvelope } from './envelope';

/**
 * How fast a travel move runs, and why it is a jog rather than a rapid.
 *
 * **`$J=` instead of `G0`, so it can be called off.** A rapid is in the
 * motion planner the moment it is accepted and the only way out is a feed
 * hold followed by a reset — which stops the machine by abandoning the
 * planner, and leaves the position in doubt. Grbl 1.1's jogging command takes
 * `G53` just as `G0` does, keeps the modal state alone, and is cancelled by
 * `jogCancel` (0x85) with the machine decelerating normally and its position
 * still known.
 *
 * The price is that a jog carries its own feed rate rather than running at
 * the machine's rapid. So it is given the axis maximum the firmware reports
 * — `$110`/`$112` — which is the same speed `G0` would have used. Without a
 * reading, a figure that crosses a small machine in a few seconds and is slow
 * enough not to surprise anyone.
 */
const MAX_RATE = { xy: '$110', z: '$112' };
const RATE_UNKNOWN = 2000;

const rate = (settings, axis) => {
  const reported = Number.parseFloat(settings?.settings?.[MAX_RATE[axis]]);
  return Number.isFinite(reported) && reported > 0 ? reported : RATE_UNKNOWN;
};

/**
 * Going back to the work zero, without dragging the tool through the stock.
 *
 * **This is where the panel leaves the old application behind.** cncjs sends
 * a bare `G0 X0 Y0` — whatever the tool is buried in, it crosses the work at
 * that depth. Every other control here is a small correction of a drawing;
 * this one is a correction of a behaviour, and it is the reason the key is in
 * the middle of the cross where a thumb lands first.
 *
 * Z goes up first, and it goes to the **top of the travel** rather than to
 * `G53 Z0`. On a Grbl that homes to the maximum — the default, `$23=0` — zero
 * is at the top and those are the same place. On a machine with the Z bit set
 * in `$23`, machine zero is at the *bottom* and `G53 Z0` would be a plunge to
 * the table. The envelope already works out which end is which, so this asks
 * it rather than assuming.
 *
 * Null when the firmware has not reported its travel. There is then no known
 * top to retract to, and the move that is left is exactly the one being
 * avoided — so the key is offered as disabled instead of as a `G0 X0 Y0` that
 * looks the same and behaves like the old application.
 *
 * `G90` is stated once, on the first line. `G53` is ignored in relative mode
 * and `G0 X0 Y0` in relative mode means "do not move" — a silent failure that
 * looks like a button that did nothing. Both lines are absolute by nature, so
 * saying so is not a mode change smuggled in: it is the mode this move is.
 */
export const goToWorkZeroLines = (settings) => {
  const envelope = machineEnvelope(settings);
  if (!envelope) {
    return null;
  }

  return [
    `$J=G53 G90 G21 Z${envelope.max.z} F${rate(settings, 'z')}`,
    `$J=G90 G21 X0 Y0 F${rate(settings, 'xy')}`,
  ];
};

/**
 * How many decimals a target is sent with.
 *
 * A cursor lands on a plane at full float precision, and `X-412.38471629`
 * says a great deal more about the mouse than about the machine. Controllers
 * report three decimals; a micron is already finer than anything pointed at
 * with a pointer.
 */
const TARGET_PRECISION = 1e3;

const round = (value) => Math.round(value * TARGET_PRECISION) / TARGET_PRECISION;

/** Whether a machine-coordinate point is somewhere the machine can reach. */
const insideEnvelope = (envelope, x, y) => x >= envelope.min.x && x <= envelope.max.x
  && y >= envelope.min.y && y <= envelope.max.y;

/**
 * Travel to a point picked off the drawing, lifting Z first.
 *
 * **In machine coordinates, because that is the frame the scene is drawn in.**
 * The point comes from a cursor over the grid, and everything on that grid —
 * the envelope, the axes, the toolpath once it has been shifted — is machine
 * coordinates. Sending it as work coordinates would land the tool somewhere
 * plausible and wrong by exactly the work offset.
 *
 * Refused outright when the point is outside the machine's own travel. With
 * soft limits on, the firmware would alarm and need a reset; with them off it
 * would drive into a limit switch. Neither is a thing to discover by pointing
 * slightly wide of the bed.
 *
 * The retract is the same one `goToWorkZeroLines` makes, and for the same
 * reason — see there for why it goes to the top of travel rather than to
 * `G53 Z0`.
 */
export const goToPointLines = (settings, point) => {
  const envelope = machineEnvelope(settings);
  if (!envelope || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  const x = round(point.x);
  const y = round(point.y);
  if (!insideEnvelope(envelope, x, y)) {
    return null;
  }

  return [
    `$J=G53 G90 G21 Z${envelope.max.z} F${rate(settings, 'z')}`,
    `$J=G53 G90 G21 X${x} Y${y} F${rate(settings, 'xy')}`,
  ];
};

/** Whether the point under the cursor is somewhere the machine could go. */
export const canGoToPoint = (settings, point) => goToPointLines(settings, point) !== null;

/** Retract, then travel to a point picked off the drawing. */
export const goToPoint = (settings, point) => {
  const lines = goToPointLines(settings, point);
  if (!lines) {
    return null;
  }
  lines.forEach((line) => {
    controller.command('gcode', line);
  });
  return lines;
};

/** Whether there is a known top of travel to retract to first. */
export const canGoToWorkZero = (settings) => goToWorkZeroLines(settings) !== null;

/** Retract, then travel to the work zero of whichever system is active. */
export const goToWorkZero = (settings) => {
  const lines = goToWorkZeroLines(settings);
  if (!lines) {
    return null;
  }
  lines.forEach((line) => {
    controller.command('gcode', line);
  });
  return lines;
};

/**
 * Call off a travel that is under way.
 *
 * The same `jogCancel` a held jog key uses, and it works here for the same
 * reason: these moves are jogs. Grbl drops whatever is left of them and
 * decelerates; nothing else in the machine's state is touched.
 */
export const cancelTravel = () => controller.command('jogCancel');

export default goToWorkZero;
