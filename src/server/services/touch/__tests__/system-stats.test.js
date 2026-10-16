/* eslint-env jest */
import { createSystemStats } from '../system-stats';

const cpu = (user, idle) => ({ model: 'NVIDIA Tegra 3', times: { user, nice: 0, sys: 0, irq: 0, idle } });

// A fake /sys and /proc: paths map to file contents, directories to listings.
const makeFs = (files, dirs) => ({
  readFileSync: (file) => {
    if (!(file in files)) {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }
    return files[file];
  },
  readdirSync: (dir) => {
    if (!(dir in dirs)) {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }
    return dirs[dir];
  }
});

const tablet = () => {
  const files = {
    '/sys/class/thermal/thermal_zone0/type': 'tsensor0-thermal\n',
    '/sys/class/thermal/thermal_zone0/temp': '41929\n',
    '/sys/class/thermal/thermal_zone2/type': 'cpu-thermal\n',
    '/sys/class/thermal/thermal_zone2/temp': '36750\n',
    '/sys/class/power_supply/surface-rt-battery/type': 'Battery\n',
    '/sys/class/power_supply/surface-rt-battery/capacity': '18\n',
    '/sys/class/power_supply/surface-rt-battery/status': 'Charging\n',
    '/sys/class/power_supply/surface-rt-ac-adapter/type': 'Mains\n',
    '/sys/class/power_supply/surface-rt-ac-adapter/online': '1\n',
    '/proc/meminfo': 'MemTotal:        2010224 kB\nMemFree:         1423520 kB\nMemAvailable:    1700768 kB\n'
  };
  const dirs = {
    // zone1 has no temp file and must be skipped.
    '/sys/class/thermal': ['thermal_zone2', 'cooling_device0', 'thermal_zone0', 'thermal_zone1'],
    '/sys/class/power_supply': ['surface-rt-ac-adapter', 'surface-rt-battery']
  };
  return { files, dirs };
};

const makeOs = (samples) => {
  let i = 0;
  return {
    cpus: () => samples[Math.min(i++, samples.length - 1)],
    totalmem: () => 2010224 * 1024,
    freemem: () => 1423520 * 1024,
    loadavg: () => [0.264, 0.16, 0.2],
    uptime: () => 3600.4,
    hostname: () => 'surface',
    platform: () => 'linux',
    arch: () => 'arm'
  };
};

describe('system stats', () => {
  test('reports usage per core since the previous sample, with sensors, memory and power', () => {
    const { files, dirs } = tablet();
    let clock = 1000;
    const stats = createSystemStats({
      os: makeOs([
        [cpu(100, 900), cpu(0, 1000), cpu(500, 500), cpu(0, 0)],
        [cpu(175, 925), cpu(0, 1100), cpu(600, 500), cpu(0, 0)]
      ]),
      fs: makeFs(files, dirs),
      now: () => clock,
      memoryUsage: () => ({ rss: 70e6, heapUsed: 30e6 }),
      processUptime: () => 59.6
    });
    clock += 1000;
    const result = stats.read();
    // core 0: 75 busy of 100; core 1: idle; core 2: fully busy; core 3: no time elapsed.
    expect(result.cores).toEqual([75, 0, 100, 0]);
    expect(result.cpu).toBe(43.8);
    expect(result.model).toBe('NVIDIA Tegra 3');
    expect(result.load).toEqual([0.3, 0.2, 0.2]);
    expect(result.temperatures).toEqual([
      { name: 'tsensor0-thermal', celsius: 41.9 },
      { name: 'cpu-thermal', celsius: 36.8 }
    ]);
    // MemAvailable, not MemFree.
    expect(result.memory.available).toBe(1700768 * 1024);
    expect(result.memory.used).toBe((2010224 - 1700768) * 1024);
    expect(result.power).toEqual({ battery: { capacity: 18, status: 'Charging' }, external: true });
    expect(result.server).toEqual({ rss: 70e6, heapUsed: 30e6, uptime: 60 });
    expect(result.uptime).toBe(3600);
  });

  test('shares one sample between requests closer than half a second', () => {
    let clock = 0;
    const os = makeOs([[cpu(0, 0)], [cpu(50, 50)], [cpu(50, 150)]]);
    const stats = createSystemStats({ os, fs: makeFs({}, {}), now: () => clock });
    clock = 1000;
    const first = stats.read();
    clock = 1400;
    expect(stats.read()).toBe(first);
    clock = 1600;
    expect(stats.read().cores).toEqual([0]);
  });

  test('answers without sysfs or procfs, for a server on Windows or macOS', () => {
    const stats = createSystemStats({ os: makeOs([[cpu(0, 0)], [cpu(10, 30)]]), fs: makeFs({}, {}), now: () => 10000 });
    const result = stats.read();
    expect(result.cores).toEqual([25]);
    expect(result.temperatures).toEqual([]);
    expect(result.power).toEqual({ battery: null, external: null });
    expect(result.memory.available).toBe(1423520 * 1024);
  });

  test('ignores unreadable or nonsensical sensor values', () => {
    const { files, dirs } = tablet();
    files['/sys/class/thermal/thermal_zone0/temp'] = 'garbage';
    files['/sys/class/power_supply/surface-rt-battery/capacity'] = '140';
    delete files['/sys/class/power_supply/surface-rt-battery/status'];
    const stats = createSystemStats({ os: makeOs([[cpu(0, 0)]]), fs: makeFs(files, dirs), now: () => 10000 });
    const result = stats.read();
    expect(result.temperatures).toEqual([{ name: 'cpu-thermal', celsius: 36.8 }]);
    expect(result.power.battery).toEqual({ capacity: 100, status: 'Unknown' });
  });
});
