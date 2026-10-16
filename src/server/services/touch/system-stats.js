// Read-only figures about the computer running CNCjs, for the settings screen
// of the touch interface: usage per CPU core, memory, temperatures, battery.
// Nothing here talks to a controller. Every reading is cheap (os.cpus() and a
// handful of small sysfs files) and is skipped when the source does not exist,
// so the same code answers on Windows or macOS with fewer fields.
import nodeFs from 'fs';
import nodeOs from 'os';
import path from 'path';

const THERMAL = '/sys/class/thermal';
const POWER = '/sys/class/power_supply';
// Several screens or tabs polling at once share one sample.
const MIN_INTERVAL_MS = 500;

const round1 = (value) => Math.round(value * 10) / 10;

const totals = (cpu) => {
  const t = cpu.times;
  const idle = t.idle;
  const busy = t.user + t.nice + t.sys + t.irq;
  return { idle, total: idle + busy };
};

export const createSystemStats = ({
  os = nodeOs,
  fs = nodeFs,
  now = Date.now,
  memoryUsage = () => process.memoryUsage(),
  processUptime = () => process.uptime()
} = {}) => {
  const readText = (file) => {
    try {
      return fs.readFileSync(file, 'utf8').trim();
    } catch (err) {
      return null;
    }
  };
  const list = (dir) => {
    try {
      return fs.readdirSync(dir).sort();
    } catch (err) {
      return [];
    }
  };

  // Sensors do not come and go while CNCjs runs: look them up once.
  const zones = list(THERMAL)
    .filter((name) => /^thermal_zone\d+$/.test(name))
    .map((name) => ({ file: path.posix.join(THERMAL, name, 'temp'), name: readText(path.posix.join(THERMAL, name, 'type')) || name }))
    .filter((zone) => readText(zone.file) !== null);
  const supplies = list(POWER).map((name) => {
    const dir = path.posix.join(POWER, name);
    return { dir, type: readText(path.posix.join(dir, 'type')) };
  });

  const usage = (previous, current) => current.map((cpu, i) => {
    const before = previous[i];
    if (!before) {
      return null;
    }
    const total = cpu.total - before.total;
    const idle = cpu.idle - before.idle;
    if (!(total > 0)) {
      return 0;
    }
    return round1(Math.min(100, Math.max(0, (1 - idle / total) * 100)));
  });

  const memory = () => {
    const total = os.totalmem();
    // os.freemem() is MemFree on older Node versions, which counts the page
    // cache as used; MemAvailable is what can still be allocated.
    const info = readText('/proc/meminfo');
    const match = info && /^MemAvailable:\s+(\d+)\s+kB$/m.exec(info);
    const available = match ? Number(match[1]) * 1024 : os.freemem();
    return { total, available, used: Math.max(0, total - available) };
  };

  const temperatures = () => zones.map((zone) => {
    const raw = Number(readText(zone.file));
    // sysfs reports millidegrees; a few drivers report whole degrees.
    const celsius = Math.abs(raw) > 1000 ? raw / 1000 : raw;
    return Number.isFinite(celsius) ? { name: zone.name, celsius: round1(celsius) } : null;
  }).filter(Boolean);

  const power = () => {
    let battery = null;
    let external = null;
    supplies.forEach(({ dir, type }) => {
      if (type === 'Battery' && !battery) {
        const capacity = Number(readText(path.posix.join(dir, 'capacity')));
        if (Number.isFinite(capacity)) {
          battery = { capacity: Math.min(100, Math.max(0, capacity)), status: readText(path.posix.join(dir, 'status')) || 'Unknown' };
        }
      } else if (type === 'Mains' || type === 'USB') {
        const online = readText(path.posix.join(dir, 'online'));
        if (online !== null) {
          external = Boolean(external) || online === '1';
        }
      }
    });
    return { battery, external };
  };

  let baseline = os.cpus().map(totals);
  let last = null;

  const read = () => {
    const at = now();
    if (last && at - last.sampledAt < MIN_INTERVAL_MS) {
      return last;
    }
    const cpus = os.cpus();
    const current = cpus.map(totals);
    const cores = usage(baseline, current);
    baseline = current;
    const known = cores.filter((value) => value !== null);
    const mem = memoryUsage();
    last = {
      sampledAt: at,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      model: cpus[0] ? cpus[0].model : '',
      cores,
      cpu: known.length ? round1(known.reduce((sum, value) => sum + value, 0) / known.length) : null,
      load: os.loadavg().map(round1),
      memory: memory(),
      temperatures: temperatures(),
      power: power(),
      uptime: Math.round(os.uptime()),
      server: { rss: mem.rss, heapUsed: mem.heapUsed, uptime: Math.round(processUptime()) }
    };
    return last;
  };

  return { read };
};

export default createSystemStats;
