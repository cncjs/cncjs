/* eslint-env jest */
import { createBacklight, MIN_PERCENT } from '../backlight';

// A fake /sys/class/backlight with one panel, max 254, writable unless told otherwise.
const makeFs = ({ max = '254\n', level = '128\n', writable = true, devices = ['backlight'] } = {}) => {
  const files = {};
  devices.forEach((name) => {
    files[`/sys/class/backlight/${name}/max_brightness`] = max;
    files[`/sys/class/backlight/${name}/brightness`] = level;
  });
  return {
    files,
    readdirSync: (dir) => {
      if (dir !== '/sys/class/backlight' || !devices.length) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
      return devices.slice();
    },
    readFileSync: (file) => {
      if (!(file in files)) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
      return files[file];
    },
    accessSync: () => {
      if (!writable) {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      }
    },
    writeFileSync: (file, value) => {
      if (!writable) {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      }
      files[file] = value;
    }
  };
};

const makeConfig = (initial = {}) => {
  const values = { ...initial };
  return {
    values,
    get: (key) => values[key],
    set: jest.fn((key, value) => {
      values[key] = value;
    })
  };
};

const manualTimers = () => {
  const pending = [];
  return {
    pending,
    setTimer: (fn, ms) => {
      const timer = { fn, ms, unref: jest.fn() };
      pending.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      const i = pending.indexOf(timer);
      if (i >= 0) {
        pending.splice(i, 1);
      }
    }
  };
};

const FILE = '/sys/class/backlight/backlight/brightness';

describe('backlight', () => {
  test('reports the panel level as a percentage', () => {
    const backlight = createBacklight({ fs: makeFs() });
    expect(backlight.status()).toEqual({ available: true, writable: true, device: 'backlight', percent: 50, minPercent: MIN_PERCENT });
  });

  test('reports a computer without a backlight, and refuses to set it', () => {
    const backlight = createBacklight({ fs: makeFs({ devices: [] }) });
    expect(backlight.status()).toEqual({ available: false, writable: false, percent: null, minPercent: MIN_PERCENT });
    expect(() => backlight.set(50)).toThrow(/Aucun rétroéclairage/);
  });

  test('reports a read-only panel and refuses to set it with a 409', () => {
    const fs = makeFs({ writable: false });
    const backlight = createBacklight({ fs });
    expect(backlight.status().writable).toBe(false);
    let error = null;
    try {
      backlight.set(80);
    } catch (err) {
      error = err;
    }
    expect(error.status).toBe(409);
    expect(fs.files[FILE]).toBe('128\n');
  });

  test('writes the level, never below the minimum, and rejects non-numbers', () => {
    const fs = makeFs();
    const backlight = createBacklight({ fs });
    expect(backlight.set(100).percent).toBe(100);
    expect(fs.files[FILE]).toBe('254');
    backlight.set(0);
    expect(fs.files[FILE]).toBe(String(Math.round(MIN_PERCENT / 100 * 254)));
    backlight.set(-20);
    expect(Number(fs.files[FILE])).toBeGreaterThan(0);
    backlight.set(150);
    expect(fs.files[FILE]).toBe('254');
    ['50', null, undefined, NaN, Infinity].forEach((value) => {
      expect(() => backlight.set(value)).toThrow(/invalide/);
    });
  });

  test('saves only the last level of a burst, two seconds later, on an unref timer', () => {
    const timers = manualTimers();
    const config = makeConfig();
    const backlight = createBacklight({ fs: makeFs(), config, setTimer: timers.setTimer, clearTimer: timers.clearTimer });
    backlight.set(30);
    backlight.set(40);
    backlight.set(65);
    expect(config.set).not.toHaveBeenCalled();
    expect(timers.pending).toHaveLength(1);
    expect(timers.pending[0].ms).toBe(2000);
    expect(timers.pending[0].unref).toHaveBeenCalled();
    timers.pending[0].fn();
    expect(config.set).toHaveBeenCalledTimes(1);
    expect(config.set).toHaveBeenCalledWith('touch.backlight.percent', 65);
  });

  test('restores the stored level at start, and does nothing without one or without rights', () => {
    let fs = makeFs();
    expect(createBacklight({ fs, config: makeConfig({ 'touch.backlight.percent': 20 }) }).restore()).toBe(true);
    expect(fs.files[FILE]).toBe(String(Math.round(0.2 * 254)));
    fs = makeFs();
    expect(createBacklight({ fs, config: makeConfig() }).restore()).toBe(false);
    expect(createBacklight({ fs, config: makeConfig({ 'touch.backlight.percent': 'bright' }) }).restore()).toBe(false);
    expect(fs.files[FILE]).toBe('128\n');
    fs = makeFs({ writable: false });
    expect(createBacklight({ fs, config: makeConfig({ 'touch.backlight.percent': 20 }) }).restore()).toBe(false);
    expect(createBacklight({ fs: makeFs({ devices: [] }), config: makeConfig({ 'touch.backlight.percent': 20 }) }).restore()).toBe(false);
  });

  test('skips devices without a sensible maximum', () => {
    const backlight = createBacklight({ fs: makeFs({ max: '0\n' }) });
    expect(backlight.status().available).toBe(false);
  });
});
