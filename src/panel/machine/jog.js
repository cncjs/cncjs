import controller from './controller';
import { machineEnvelope } from './envelope';

const GRBL = 'Grbl';
const SMOOTHIE = 'Smoothie';

/** What the mockup offers, in the order it offers it. */
export const XY_STEPS = [0.1, 1, 10, 50];
export const Z_STEPS = [0.1, 1, 5];
export const FEEDRATES = [500, 1500, 3000];

/**
 * A jog is a direction, not an axis.
 *
 * The four corners of the cross move two axes at once, so everything below
 * takes a map of axis to number rather than an axis and a distance. A single
 * key is `{ x: 10 }`; a corner is `{ x: 10, y: 10 }`. One shape means the
 * corners are not a second kind of control with their own rules — they hold,
 * they cancel, and they obey the step and the feed rate exactly as the sides
 * do.
 *
 * Written out in X, Y, Z order so the line is the same whichever order the
 * caller happened to build the map in, and an axis asking for nothing is left
 * off it entirely.
 */
const AXIS_ORDER = ['x', 'y', 'z'];

const words = (moves) => AXIS_ORDER
  .filter((axis) => Number.isFinite(moves[axis]) && moves[axis] !== 0)
  .map((axis) => `${axis.toUpperCase()}${moves[axis]}`)
  .join(' ');

/**
 * The lines that move the machine one step in some direction.
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
export const jogLines = ({ type, moves, feedrate }) => {
  const word = words(moves);

  if (type === GRBL || type === SMOOTHIE) {
    return [`$J=G91 G21 ${word} F${feedrate}`];
  }

  return ['G91', `G1 ${word} F${feedrate}`, 'G90'];
};

/**
 * How far an axis can still go in one direction before it runs out.
 *
 * **This is what a held key has to ask, and asking the wrong question broke
 * it.** `jogTravel` answers "how long is this axis", which as a relative move
 * from wherever the tool happens to be overshoots the end of the table almost
 * every time. With `$20=1` the firmware refuses the line outright — it does
 * not clip it — so holding a key did nothing at all, silently. With soft
 * limits off the same line runs into a limit switch instead.
 *
 * Null when the machine has not reported its travel, in which case there is
 * no boundary to measure against and the bounded fallback stands.
 */
export const jogRoom = (axis, sign, settings, position) => {
  const envelope = machineEnvelope(settings);
  const at = Number.parseFloat(position?.[axis]);

  if (!envelope || !Number.isFinite(at)) {
    return null;
  }

  return sign > 0 ? envelope.max[axis] - at : at - envelope.min[axis];
};

/**
 * Move by one step, never past the end of the travel.
 *
 * **A tap has the same problem a held key had, and it was easier to miss.**
 * A relative step off the end of the axis is refused outright by a firmware
 * with soft limits on — not clipped — so at the edge of the table the key did
 * nothing at all and said nothing about why. Held keys were bounded first;
 * this is the same rule for the other half of the control, and without it the
 * pad reads as "sometimes it works".
 *
 * The step is shortened to what is left rather than refused, so the tool ends
 * up exactly at the limit instead of a millimetre short of it. Nothing is
 * sent once there is nothing left to give.
 */
export const jog = ({ type, moves, feedrate, settings, position }) => {
  const bounded = {};

  for (const axis of Object.keys(moves)) {
    const want = moves[axis];
    const room = jogRoom(axis, Math.sign(want), settings, position);
    const allowed = room === null ? Math.abs(want) : Math.min(Math.abs(want), Math.max(0, room));
    if (allowed > 0) {
      bounded[axis] = Math.sign(want) * allowed;
    }
  }

  if (!Object.keys(bounded).length) {
    return false;
  }

  jogLines({ type, moves: bounded, feedrate }).forEach((line) => {
    controller.command('gcode', line);
  });
  return true;
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

/**
 * How far a held key is allowed to travel before it must be pressed again.
 *
 * A continuous jog is one long `$J=` that is cancelled when the key comes up,
 * so the distance is a bound on what happens if the release is never seen —
 * a window losing focus, a browser tab going to sleep, a touch that turns into
 * a scroll. The machine's own `$130`/`$131`/`$132` say how far the axis can go
 * at all, so asking for more than that is asking for the limit switch.
 *
 * Without that reading, 100mm. It is far enough to cross a small bed and near
 * enough that a lost release is a mistake rather than an accident.
 */
const TRAVEL = { x: '$130', y: '$131', z: '$132' };
const TRAVEL_UNKNOWN = 100;

export const jogTravel = (axis, settings) => {
  const reported = settings?.settings?.[TRAVEL[axis]];
  const distance = Number.parseFloat(reported);
  return Number.isFinite(distance) && distance > 0 ? distance : TRAVEL_UNKNOWN;
};

/**
 * Whether a key can be held down to keep moving.
 *
 * Only Grbl. Continuous jogging is one long move plus the ability to abandon
 * it, and `jogCancel` (0x85) is what abandons it — Smoothie takes `$J=` but has
 * no cancel, so a held key there would commit to the whole distance before the
 * finger came off. That is not a control, it is a trap.
 */
export const canJogContinuously = (type) => type === GRBL;

/** Stop a jog that is already running. */
export const jogStop = (type) => {
  if (type === GRBL) {
    controller.command('jogCancel');
  }
};

/**
 * Start jogging, and keep jogging until `jogStop`.
 *
 * **The loop lives in the server**, because it is driven by `ok` — the
 * acknowledgement of each short `$J=` — and only the side holding the serial
 * port sees those. Grbl's own documentation describes the method; a client
 * can only guess at the rhythm, and a guess that sends faster than the
 * machine consumes builds a backlog that a change of direction has to wait
 * behind. See `src/server/controllers/Grbl/jog.js`.
 *
 * Aiming a running jog somewhere else is this same call again: the server
 * lets the segments in flight finish and sends the next ones the new way, so
 * turning never needs a cancel.
 *
 * Only Grbl. Smoothie takes `$J=` but has no way to call one off, so a held
 * key there would commit to the whole distance before the finger came up —
 * that is not a control, it is a trap.
 */
export const jogStart = (type, dir, feedrate) => {
  if (!canJogContinuously(type)) {
    return false;
  }
  controller.command('jogStart', dir, feedrate);
  return true;
};
