import { canHome } from './homing';

/** What a reading says when there is nothing to say. Not "0", not an empty cell. */
export const NO_READING = '–';

const GRBL = 'Grbl';
const SMOOTHIE = 'Smoothie';
const TINYG = 'TinyG';

/**
 * Which tone a machine state is shown in.
 *
 * Grbl reports nine states and the panel shows three colours plus an absence
 * of one, so the mapping is a judgement and is written down rather than spread
 * through a view:
 *
 * - **running** — the tool is moving. Run, Jog and Home are all motion.
 * - **ready** — powered, holding position, one command away from moving. Hold
 *   belongs here: a feed hold is a pause someone asked for, and colouring it
 *   like an alarm spends the alarm colour on something working as intended.
 * - **stopped** — it will not move until someone deals with it. Alarm is the
 *   machine refusing; Door is the same refusal arriving from outside.
 * - **inactive** — nothing to report, and no colour to spend on it.
 */
const GRBL_TONES = {
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

// TinyG answers the same question with an integer. An operator should not have
// to know which firmware they are looking at in order to read the chip.
const TINYG_STATES = {
  0: { word: 'Initializing', tone: 'inactive' },
  1: { word: 'Ready', tone: 'ready' },
  2: { word: 'Alarm', tone: 'stopped' },
  3: { word: 'Stop', tone: 'ready' },
  4: { word: 'End', tone: 'ready' },
  5: { word: 'Run', tone: 'running' },
  6: { word: 'Hold', tone: 'ready' },
  7: { word: 'Probe', tone: 'running' },
  8: { word: 'Cycle', tone: 'running' },
  9: { word: 'Home', tone: 'running' },
  10: { word: 'Jog', tone: 'running' },
  11: { word: 'Interlock', tone: 'stopped' },
  12: { word: 'Shutdown', tone: 'stopped' },
  13: { word: 'Panic', tone: 'stopped' },
};

const activeStateOf = (type, state) => {
  if (type === GRBL || type === SMOOTHIE) {
    const word = state?.status?.activeState;
    return word ? { word, tone: GRBL_TONES[word] || 'inactive' } : null;
  }
  if (type === TINYG) {
    return TINYG_STATES[state?.sr?.machineState] || null;
  }
  // Marlin has no machine state at all, and anything unrecognised must not
  // inherit somebody else's vocabulary.
  return null;
};

/** One axis of a position, or nothing. `which` is `wpos` or `mpos`. */
const positionOf = (type, state, axis, which = 'wpos') => {
  const from = type === TINYG ? state?.sr?.[which] : state?.status?.[which];
  const value = from?.[axis];
  return value === undefined || value === null ? null : Number(value);
};

const positions = (type, state, which) => ({
  x: positionOf(type, state, 'x', which),
  y: positionOf(type, state, 'y', which),
  z: positionOf(type, state, 'z', which),
});

/**
 * The modal state, which is where the active work coordinate system lives.
 *
 * Needed by anything that writes an offset: `G10 L20 P<n>` has to name the
 * coordinate system the machine is currently working in, and guessing it is a
 * silent way to send a tool somewhere it should not be.
 */
const modalOf = (type, state) => (
  type === TINYG ? state?.sr?.modal : state?.parserstate?.modal
) || {};

/**
 * The three override percentages, in the order the controller sends them.
 *
 * Grbl's `Ov:` is feed, rapid, spindle — not the order a panel draws them in
 * and not the order anyone would guess. Unpacking it in one named place is
 * what stops a view from pairing the spindle figure with the rapid control.
 */
const overridesOf = (type, state) => {
  const ov = (type === TINYG ? state?.sr?.ov : state?.status?.ov) || [];
  const [feed = 100, rapid = 100, spindle = 100] = ov;
  return { feed, rapid, spindle };
};

/** What is in the spindle and how fast it is turning. */
const toolOf = (type, state) => {
  const parser = type === TINYG ? state?.sr : state?.parserstate;
  return {
    tool: parser?.tool ?? null,
    spindle: state?.status?.spindle ?? null,
    feedrate: state?.status?.feedrate ?? null,
  };
};

/**
 * Everything on screen, derived in one place.
 *
 * The views take what this returns and arrange it. Nothing downstream reaches
 * into a controller payload, so the four firmwares' disagreements are settled
 * here and only here.
 */
export const readMachine = ({ connection, error, port, type, state, settings, attached, job, gcode }) => {
  // "Connected" means *able to send*, not "a port is open somewhere". The
  // socket has to attach to the port before `Controller.command()` will do
  // anything at all — it begins `if (!this.port) return` and fails silently —
  // so a panel that enabled its controls on the snapshot alone would have a
  // window in which every jog key looked pressable and did nothing.
  const connected = Boolean(port) && connection === 'open' && Boolean(attached);
  const active = connected ? activeStateOf(type, state) : null;

  let word = 'Disconnected';
  let tone = 'inactive';
  if (connection === 'failed') {
    word = 'No server';
    tone = 'stopped';
  } else if (connection === 'connecting') {
    word = 'Connecting';
    tone = 'inactive';
  } else if (port && !attached) {
    word = 'Connecting';
    tone = 'inactive';
  } else if (connected) {
    // "Connected" rather than an invented "Idle": between opening a port and
    // the first status report there is genuinely nothing to say.
    word = active ? active.word : 'Connected';
    tone = active ? active.tone : 'inactive';
  }

  return {
    connected,
    error,
    port,
    type,
    status: { word, tone, known: Boolean(active) },
    overrides: overridesOf(type, state),
    tool: toolOf(type, state),
    position: positions(type, state, 'wpos'),
    // Machine coordinates matter in two places only — homing and "why is the
    // work zero where it is" — so they are a quiet second reading rather than
    // a tile of their own.
    machinePosition: positions(type, state, 'mpos'),
    modal: modalOf(type, state),
    /**
     * The loaded job, or nothing.
     *
     * `total > 0` is the test for "there is a job", not the presence of the
     * object: the sender reports its status continuously and reports zeroes
     * when nothing is loaded, and a panel that read that as a job would offer
     * Start for a file that does not exist.
     */
    // Whether this machine can be sent home. Not a preference — whether
    // limit switches exist and are turned on, which only the firmware
    // knows. See `homing.js`.
    canHome: connected && canHome(type, settings),
    // Carried whole because more than one thing needs it: homing reads
    // `$22`, a held jog reads the axis travel so it cannot ask for more
    // than the machine has.
    settings: settings || {},
    /**
     * The loaded program as text, or nothing.
     *
     * Separate from `job` on purpose. `job` is the sender's progress through
     * a program and is reported continuously; this is the program itself and
     * arrives once. The toolpath screen wants the second and the status bar
     * wants the first, and a machine with a program loaded but not started has
     * one without the other.
     */
    gcode: gcode || null,
    job: job && job.total > 0
? {
      name: job.name || '',
      total: job.total,
      sent: job.sent || 0,
      received: job.received || 0,
      remaining: job.remainingTime || 0,
      percent: Math.min(100, Math.round(((job.received || 0) / job.total) * 100)),
    }
: null,
  };
};

/** A position in millimetres, fixed to three decimals so digits do not move. */
export const formatPosition = (value) => (
  value === null || Number.isNaN(value) ? NO_READING : value.toFixed(3)
);
