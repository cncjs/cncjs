import { ensureArray } from 'ensure-type';
import mapGCodeToText from 'app/lib/gcode-text';
import { NO_READING } from 'app/lib/reading';

/**
 * Which of the four tones a Grbl state is shown in.
 *
 * Grbl 1.1 reports nine states and the panel shows three colours plus an
 * absence of colour, so the mapping is a judgement and is written down here
 * rather than spread through a view:
 *
 * - **running** — the tool is moving. Run, Jog and Home are all motion; the
 *   fact that one of them was commanded by the operator and another by a
 *   program does not change what the machine is doing.
 * - **ready** — powered, holding position, and one command away from moving.
 *   Idle is the obvious one. Hold belongs here too: a feed hold is a pause an
 *   operator asked for, and colouring it like an alarm would spend the alarm
 *   colour on something that is working as intended.
 * - **stopped** — it will not move until someone deals with it. Alarm is the
 *   machine refusing; Door is a safety interlock, which is the same refusal
 *   arriving from outside.
 * - **inactive** — nothing to report. Check mode is parsing G-code without
 *   moving, Sleep has the drivers disabled, and an unknown or absent state is
 *   the disconnected case. None of them is a machine state an operator acts
 *   on, and giving them a colour would dilute the three that are.
 */
const TONES = {
  Run: 'running',
  Jog: 'running',
  Home: 'running',
  Idle: 'ready',
  Hold: 'ready',
  Alarm: 'stopped',
  Door: 'stopped',
  Check: 'inactive',
  Sleep: 'inactive',
};

export const stateTone = (activeState) => TONES[activeState] || 'inactive';

/** The state word, or the dash when the controller has not said. */
export const machineState = (status = {}) => status.activeState || NO_READING;

const firstReported = (...values) => {
  const value = values.find((candidate) => candidate !== undefined);
  return value === undefined ? NO_READING : value;
};

/**
 * The figures under the state: what it is cutting at, and with what.
 *
 * `feedrate` and `spindle` are read from the status report first and the
 * parser state second. The two are different questions — the status report is
 * what the machine is doing now, the parser state is what it was last told to
 * do — and the status report wins because a panel is about the machine, not
 * about the program. The fallback matters on a controller that reports neither
 * in its status line.
 */
export const statusReadings = (status = {}, parserState = {}) => ({
  feedrate: firstReported(status.feedrate, parserState.feedrate),
  spindle: firstReported(status.spindle, parserState.spindle),
  tool: firstReported(parserState.tool),
});

const translate = (code) => (code ? mapGCodeToText(code) : NO_READING);

/**
 * The modal groups, translated out of G-code.
 *
 * "G21" is unreadable to anyone not already fluent, and turning it into
 * "Millimeters (G21)" is the only work this part of the panel does. The code
 * is kept alongside the words rather than replaced by them: the operator who
 * does read G-code is the one most likely to be looking here.
 *
 * Coolant is the one group Grbl can report twice at once — mist and flood
 * together — so it arrives as an array and stays one.
 */
export const modalReadings = (modal = {}) => ({
  motion: translate(modal.motion),
  wcs: translate(modal.wcs),
  plane: translate(modal.plane),
  distance: translate(modal.distance),
  feedrate: translate(modal.feedrate),
  units: translate(modal.units),
  program: translate(modal.program),
  spindle: translate(modal.spindle),
  coolant: ensureArray(modal.coolant).map(translate).join(', ') || NO_READING,
});

/**
 * The three override percentages, in the order Grbl sends them.
 *
 * `Ov:` is feed, rapid, spindle — not the order the panel draws them in, and
 * not the order anyone would guess. Unpacking it in one named place is what
 * stops a view from quietly pairing the spindle figure with the rapid buttons.
 */
export const overridePercents = (status = {}) => {
  const [feed = 0, rapid = 0, spindle = 0] = ensureArray(status.ov);
  return { feed, rapid, spindle };
};

/** True when any override is reported at all — Grbl omits `Ov:` entirely. */
export const hasOverrides = (status = {}) => {
  const { feed, rapid, spindle } = overridePercents(status);
  return Boolean(feed || rapid || spindle);
};

/**
 * How full the controller's two buffers are, or nothing at all.
 *
 * Buffer data rides in the status report only when bit 1 of `$10` is set, and
 * it is off in a default Grbl build. Returning null rather than zeroes is the
 * difference between "the queue is empty" and "the controller never said" —
 * and a planner bar pinned at zero reads as a stalled job.
 *
 * The maximum is carried in rather than derived, because the planner's depth
 * is only learnable by watching it: Grbl never states it, so the deepest value
 * seen so far is the only scale there is.
 */
export const queueBuffers = (status = {}, seenMax = {}) => {
  const { buf } = status;
  if (!buf) {
    return null;
  }
  return {
    planner: Number(buf.planner) || 0,
    plannerMax: Math.max(Number(seenMax.planner) || 0, Number(buf.planner) || 0),
    rx: Number(buf.rx) || 0,
    rxMax: Math.max(Number(seenMax.rx) || 0, Number(buf.rx) || 0),
  };
};

/** A buffer as a percentage of the deepest it has been seen to go. */
export const bufferPercent = (value, max) => {
  if (!(max > 0)) {
    return 0;
  }
  return Math.min(100, Math.round((value / max) * 100));
};
