// Screen backlight of the computer running CNCjs (Réglages → Affichage →
// Luminosité in the touch interface), through /sys/class/backlight. Writing
// needs the brightness file to be writable by the CNCjs user, normally through
// a udev rule; without it the setting is reported as read-only. Nothing here
// talks to a controller. The last level is kept in the CNCjs configuration and
// applied again when the service starts, since the kernel resets it on boot.
// The screen saver may set a temporary level (down to 0, fully off) that is
// never stored; `wake` puts the operator's level back.
import nodeFs from 'fs';
import path from 'path';

const BACKLIGHT = '/sys/class/backlight';
const CONFIG_KEY = 'touch.backlight.percent';
// A slider sends several levels in a row: only the last one is written to .cncrc.
const SAVE_DELAY_MS = 2000;
// Never fully dark: a black panel cannot be found again by touch.
export const MIN_PERCENT = 5;

const clampPercent = (value) => Math.min(100, Math.max(MIN_PERCENT, Math.round(value)));

export const createBacklight = ({ fs = nodeFs, config = null, setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  let saveTimer = null;
  const readNumber = (file) => {
    try {
      const value = Number(fs.readFileSync(file, 'utf8').trim());
      return Number.isFinite(value) ? value : null;
    } catch (err) {
      return null;
    }
  };

  // The first device with a sensible maximum; firmware and raw interfaces
  // would be listed the same way, panels usually expose one.
  let device = null;
  try {
    const names = fs.readdirSync(BACKLIGHT).sort();
    for (const name of names) {
      const dir = path.posix.join(BACKLIGHT, name);
      const max = readNumber(path.posix.join(dir, 'max_brightness'));
      if (max && max > 0) {
        device = { name, max, file: path.posix.join(dir, 'brightness') };
        break;
      }
    }
  } catch (err) {
    device = null;
  }

  const writable = () => {
    if (!device) {
      return false;
    }
    try {
      fs.accessSync(device.file, nodeFs.constants.W_OK);
      return true;
    } catch (err) {
      return false;
    }
  };

  const current = () => {
    const raw = device ? readNumber(device.file) : null;
    return raw === null ? null : Math.round(raw / device.max * 100);
  };

  // The operator's level, as opposed to a temporary screen-saver level. A panel
  // found dark (CNCjs restarted while the screen saver had it off) is not one.
  const DEFAULT_PERCENT = 50;
  const found = current();
  let userPercent = found;
  if (found !== null && found < MIN_PERCENT) {
    userPercent = DEFAULT_PERCENT;
  }
  let temporary = false;

  const status = () => {
    if (!device) {
      return { available: false, writable: false, percent: null, userPercent: null, temporary: false, minPercent: MIN_PERCENT };
    }
    return {
      available: true,
      writable: writable(),
      device: device.name,
      percent: current(),
      userPercent,
      temporary,
      minPercent: MIN_PERCENT
    };
  };

  const apply = (percent) => {
    const value = clampPercent(percent);
    fs.writeFileSync(device.file, String(Math.max(1, Math.round(value / 100 * device.max))));
    return value;
  };

  const check = () => {
    if (!device) {
      throw Object.assign(new Error('Aucun rétroéclairage réglable sur cet ordinateur.'), { status: 409 });
    }
    if (!writable()) {
      throw Object.assign(new Error('Réglage refusé : le système ne permet pas à CNCjs de modifier la luminosité.'), { status: 409 });
    }
  };

  // Screen saver: 0 turns the panel off; anything else is clamped like a normal level.
  const dim = (percent) => {
    if (typeof percent !== 'number' || !Number.isFinite(percent)) {
      throw Object.assign(new Error('Luminosité invalide.'), { status: 400 });
    }
    check();
    if (percent <= 0) {
      fs.writeFileSync(device.file, '0');
    } else {
      apply(percent);
    }
    temporary = true;
    return status();
  };

  const wake = () => {
    check();
    if (temporary && typeof userPercent === 'number') {
      apply(userPercent);
    }
    temporary = false;
    return status();
  };

  const set = (percent) => {
    if (typeof percent !== 'number' || !Number.isFinite(percent)) {
      throw Object.assign(new Error('Luminosité invalide.'), { status: 400 });
    }
    check();
    const value = apply(percent);
    userPercent = value;
    temporary = false;
    if (config) {
      clearTimer(saveTimer);
      saveTimer = setTimer(() => {
        saveTimer = null;
        config.set(CONFIG_KEY, value);
      }, SAVE_DELAY_MS);
      if (saveTimer && saveTimer.unref) {
        saveTimer.unref();
      }
    }
    return status();
  };

  // Restores the stored level once at start; any failure leaves the panel as it is.
  const restore = () => {
    const stored = config ? config.get(CONFIG_KEY) : undefined;
    if (typeof stored !== 'number' || !Number.isFinite(stored) || !writable()) {
      return false;
    }
    try {
      userPercent = apply(stored);
      return true;
    } catch (err) {
      return false;
    }
  };

  return { status, set, dim, wake, restore };
};

export default createBacklight;
