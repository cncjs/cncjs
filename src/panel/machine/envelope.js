/**
 * Where the machine can reach, and where the work sits inside it.
 *
 * Every outline the toolpath screen draws except the program's own is read
 * out of the firmware rather than configured anywhere. That is deliberate:
 * this panel has no idea what machine it is attached to, and the only source
 * that does is the controller in front of it.
 *
 * All of it is in **machine coordinates**, because that is the one frame
 * every outline shares. Work coordinates move when somebody sets a zero; the
 * machine's own travel does not.
 */

// `$130`/`$131`/`$132` — how far each axis can travel, in millimetres.
const TRAVEL = { x: '$130', y: '$131', z: '$132' };

/**
 * `$23` — the homing direction invert mask, and the setting that decides
 * which side of zero the machine lives on.
 *
 * Grbl homes toward the positive end by default and sets machine zero there,
 * so the reachable volume is *negative*: `[-$130, 0]`. That is the source of
 * the "why are my machine coordinates all minus" question, and it is also why
 * an envelope drawn as `[0, travel]` comes out mirrored through the origin —
 * the right size, in the wrong place, which looks plausible enough to ship.
 *
 * A set bit flips that axis to home at the negative end, putting zero at the
 * minimum and the volume in `[0, $13x]`.
 *
 * One bit per axis, in X, Y, Z order.
 */
const INVERT_MASK = '$23';
const INVERT_BIT = { x: 1, y: 2, z: 4 };

// `$20` — whether the firmware enforces the travel as a limit rather than
// merely reporting it.
const SOFT_LIMITS = '$20';

// `$22` — whether this machine can be homed at all. See `machineZeroIsGuess`.
const HOMING_ENABLED = '$22';

const AXES = ['x', 'y', 'z'];

/** One `$`-setting as a number, or null when the firmware has not said. */
const setting = (settings, name) => {
  const value = Number.parseFloat(settings?.settings?.[name]);
  return Number.isFinite(value) ? value : null;
};

/**
 * The box the machine can reach, in machine coordinates.
 *
 * Null when any axis has not reported its travel: three quarters of an
 * envelope is not an envelope, and half-drawing one would put a wall where
 * there is none.
 */
export const machineEnvelope = (settings) => {
  const mask = setting(settings, INVERT_MASK) || 0;
  const min = {};
  const max = {};

  for (const axis of AXES) {
    const travel = setting(settings, TRAVEL[axis]);
    if (travel === null || travel <= 0) {
      return null;
    }
    const homesToMinimum = (mask & INVERT_BIT[axis]) !== 0;
    min[axis] = homesToMinimum ? 0 : -travel;
    max[axis] = homesToMinimum ? travel : 0;
  }

  return { min, max };
};

/**
 * Whether the firmware treats the envelope as a fence or as a description.
 *
 * The same numbers either way, which is why this is a separate reading rather
 * than a second box: with `$20=0` the outline says how far the axes can go,
 * and nothing stops a move going further.
 */
export const softLimitsEnabled = (settings) => setting(settings, SOFT_LIMITS) === 1;

/**
 * Whether machine zero — and therefore every outline drawn from it — is a
 * guess.
 *
 * With `$22=0` homing is off, which means machine zero is wherever the
 * controller happened to be powered on. The envelope is then the right *size*
 * and in an unknown *place*, and a screen that draws it as a confident frame
 * is claiming to know something it cannot.
 *
 * With `$22=1` this returns false, and that is the weaker half of the answer:
 * the machine *can* be homed, not that it *has* been. An operator who clears
 * the startup alarm with `$X` instead of `$H` has an unhomed machine that
 * reports exactly like a homed one, and the firmware offers nothing that
 * separates them. Known gap, written down rather than papered over.
 */
export const machineZeroIsGuess = (settings) => {
  const flag = settings?.settings?.[HOMING_ENABLED];
  return flag !== undefined && String(flag).trim() === '0';
};

/**
 * The work coordinate systems the firmware has reported, in machine
 * coordinates.
 *
 * These arrive only in answer to `$#`, and nothing in the server asks — see
 * `askForWorkOffsets` in `workOffsets.js`. Until something does, this is an
 * empty list rather than a wrong one.
 */
export const workOrigins = (settings) => {
  const parameters = settings?.parameters || {};

  return ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']
    .map((name) => {
      const value = parameters[name];
      const origin = {};
      for (const axis of AXES) {
        const number = Number.parseFloat(value?.[axis]);
        if (!Number.isFinite(number)) {
          return null;
        }
        origin[axis] = number;
      }
      return { name, origin };
    })
    .filter(Boolean);
};

/**
 * The offset between machine and work coordinates, derived rather than read.
 *
 * Grbl reports `WCO:` in its status, but not in every report — it is sent on
 * change and every tenth report otherwise, so a client that waits for one has
 * a window where it has positions in two frames and no way to relate them.
 * The difference between the two positions it *does* send in every report is
 * the same number and is always there.
 */
export const workOffset = (machinePosition, position) => {
  const offset = {};

  for (const axis of AXES) {
    const mpos = machinePosition?.[axis];
    const wpos = position?.[axis];
    if (!Number.isFinite(mpos) || !Number.isFinite(wpos)) {
      return null;
    }
    offset[axis] = mpos - wpos;
  }

  return offset;
};

export default machineEnvelope;
