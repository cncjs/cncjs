/* eslint-env jest */
import { createSystemStats, parseIwLink } from '../system-stats';

const cpu = (user, idle) => ({ model: 'NVIDIA Tegra 3', times: { user, nice: 0, sys: 0, irq: 0, idle } });

// A fake /sys and /proc: paths map to file contents, directories to listings.
const makeFs = (files, dirs, binaries = []) => ({
  statSync: (file) => {
    if (!binaries.includes(file)) {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }
    return { isFile: () => true };
  },
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
    arch: () => 'arm',
    networkInterfaces: () => ({
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      mlan0: [{ address: '192.0.2.31', family: 'IPv4', internal: false }, { address: 'fe80::1', family: 'IPv6', internal: false }]
    })
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

  test('parses the link of `iw dev <name> link`', () => {
    expect(parseIwLink('Not connected.\n')).toBe(null);
    expect(parseIwLink(undefined)).toBe(null);
    expect(parseIwLink([
      'Connected to 00:00:5e:00:53:01 (on mlan0)',
      '\tSSID: Atelier 2.4',
      '\tfreq: 2437',
      '\tsignal: -60 dBm',
      '\trx bitrate: 130.0 MBit/s MCS 14 short GI'
    ].join('\n'))).toEqual({ ssid: 'Atelier 2.4', signalDbm: -60, frequencyMhz: 2437, bitrateMbps: 130 });
    // Missing fields stay null rather than 0.
    expect(parseIwLink('Connected to 00:00:5e:00:53:01 (on mlan0)\n\tSSID: x\n')).toEqual({ ssid: 'x', signalDbm: null, frequencyMhz: null, bitrateMbps: null });
  });

  test('reports addresses and reads the Wi-Fi link in the background, at most every 10 s', () => {
    const files = { '/sys/class/net/mlan0/operstate': 'up\n', '/sys/class/net/eth0/operstate': 'down\n' };
    const dirs = { '/sys/class/net': ['eth0', 'lo', 'mlan0'], '/sys/class/net/mlan0': ['operstate', 'wireless'], '/sys/class/net/eth0': ['operstate'] };
    const calls = [];
    let clock = 10000;
    const stats = createSystemStats({
      os: makeOs([[cpu(0, 0)]]),
      fs: makeFs(files, dirs, ['/usr/sbin/iw']),
      execFile: (file, args, options, done) => calls.push({ file, args, options, done }),
      now: () => clock
    });
    let result = stats.read();
    expect(result.network.interfaces).toEqual([{ name: 'mlan0', address: '192.0.2.31' }]);
    expect(result.network.wifi).toBe(null);
    expect(calls).toHaveLength(1);
    expect(calls[0].file).toBe('/usr/sbin/iw');
    expect(calls[0].args).toEqual(['dev', 'mlan0', 'link']);
    expect(calls[0].options.timeout).toBe(1500);
    calls[0].done(null, 'Connected to 00:00:5e:00:53:01 (on mlan0)\n\tSSID: Atelier\n\tsignal: -71 dBm\n');
    clock += 1000;
    result = stats.read();
    expect(result.network.wifi).toEqual({ interface: 'mlan0', ssid: 'Atelier', signalDbm: -71, frequencyMhz: null, bitrateMbps: null });
    expect(calls).toHaveLength(1);
    clock += 10000;
    stats.read();
    expect(calls).toHaveLength(2);
    // A failed or timed-out read reports the interface without a link.
    calls[1].done(new Error('timeout'));
    clock += 1000;
    expect(stats.read().network.wifi).toEqual({ interface: 'mlan0', ssid: null, signalDbm: null, frequencyMhz: null, bitrateMbps: null });
  });

  test('never spawns anything without a wireless interface or without iw', () => {
    const execFile = jest.fn();
    createSystemStats({ os: makeOs([[cpu(0, 0)]]), fs: makeFs({}, {}), execFile, now: () => 10000 }).read();
    const dirs = { '/sys/class/net': ['mlan0'], '/sys/class/net/mlan0': ['wireless'] };
    createSystemStats({ os: makeOs([[cpu(0, 0)]]), fs: makeFs({ '/sys/class/net/mlan0/operstate': 'up' }, dirs), execFile, now: () => 10000 }).read();
    expect(execFile).not.toHaveBeenCalled();
  });

  test('keeps ten minutes of CPU and temperature history, one point per sample', () => {
    const { files, dirs } = tablet();
    let clock = 0;
    const samples = Array.from({ length: 130 }, (_, i) => [cpu(i, 100 - (i % 100))]);
    const stats = createSystemStats({ os: makeOs(samples), fs: makeFs(files, dirs), now: () => clock });
    for (let i = 0; i < 125; i++) {
      clock += 5000;
      stats.record();
    }
    // Two records within the shared-sample window add one point only.
    stats.record();
    const { history } = stats.read();
    expect(history.interval).toBe(5);
    expect(history.cpu).toHaveLength(120);
    expect(history.temperature).toHaveLength(120);
    // The cpu-thermal zone is the reference temperature.
    expect(history.temperature.every((value) => value === 36.8)).toBe(true);
    const before = history.cpu;
    clock += 5000;
    stats.record();
    expect(before).toHaveLength(120);
    expect(stats.read().history.cpu).not.toBe(before);
  });

  test('samples the history on an unref timer that start and stop control', () => {
    jest.useFakeTimers();
    try {
      let clock = 0;
      const stats = createSystemStats({ os: makeOs([[cpu(0, 0)], [cpu(1, 1)]]), fs: makeFs({}, {}), now: () => clock });
      stats.start();
      stats.start();
      expect(stats.read().history.cpu).toHaveLength(1);
      clock = 5000;
      jest.advanceTimersByTime(5000);
      expect(stats.read().history.cpu).toHaveLength(2);
      stats.stop();
      clock = 10000;
      jest.advanceTimersByTime(10000);
      expect(stats.read().history.cpu).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
