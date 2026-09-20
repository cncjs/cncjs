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

/** The work position of one axis, or nothing. */
const positionOf = (type, state, axis) => {
  const wpos = type === TINYG ? state?.sr?.wpos : state?.status?.wpos;
  const value = wpos?.[axis];
  return value === undefined || value === null ? null : Number(value);
};

/**
 * Everything on screen, derived in one place.
 *
 * The views take what this returns and arrange it. Nothing downstream reaches
 * into a controller payload, so the four firmwares' disagreements are settled
 * here and only here.
 */
export const readMachine = ({ connection, error, port, type, state }) => {
  const connected = Boolean(port) && connection === 'open';
  const active = connected ? activeStateOf(type, state) : null;

  let word = 'Disconnected';
  let tone = 'inactive';
  if (connection === 'failed') {
    word = 'No server';
    tone = 'stopped';
  } else if (connection === 'connecting') {
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
    position: {
      x: positionOf(type, state, 'x'),
      y: positionOf(type, state, 'y'),
      z: positionOf(type, state, 'z'),
    },
  };
};

/** A position in millimetres, fixed to three decimals so digits do not move. */
export const formatPosition = (value) => (
  value === null || Number.isNaN(value) ? NO_READING : value.toFixed(3)
);
