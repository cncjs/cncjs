// Read-only figures about the computer running CNCjs, for the settings screen
// of the touch interface: usage per CPU core, memory, temperatures, battery,
// network link, and a short history of CPU usage and temperature.
// Nothing here talks to a controller. Every reading is cheap (os.cpus() and a
// handful of small sysfs files) and is skipped when the source does not exist,
// so the same code answers on Windows or macOS with fewer fields.
import { execFile as nodeExecFile } from 'child_process';
import nodeFs from 'fs';
import nodeOs from 'os';
import path from 'path';

const THERMAL = '/sys/class/thermal';
const POWER = '/sys/class/power_supply';
const NET = '/sys/class/net';
// `iw` lives in /usr/sbin, which is not always on the PATH of a service.
const IW = ['/usr/sbin/iw', '/sbin/iw', '/usr/bin/iw'];
// Several screens or tabs polling at once share one sample.
const MIN_INTERVAL_MS = 500;
// History: one point every 5 s, ten minutes kept, sampled even when nobody looks.
const HISTORY_INTERVAL_MS = 5000;
const HISTORY_LENGTH = 120;
// The Wi-Fi link is read with a child process, so less often and never inline.
const WIFI_INTERVAL_MS = 10000;
const WIFI_TIMEOUT_MS = 1500;

// Parses `iw dev <name> link`; null when not associated.
export const parseIwLink = (text) => {
  if (typeof text !== 'string' || !/^Connected to /m.test(text)) {
    return null;
  }
  const field = (re) => {
    const match = re.exec(text);
    return match ? match[1].trim() : null;
  };
  const number = (re) => {
    const value = field(re);
    return value === null ? null : Number(value);
  };
  return {
    ssid: field(/^\s*SSID:\s*(.*)$/m),
    signalDbm: number(/^\s*signal:\s*(-?\d+(?:\.\d+)?)\s*dBm/m),
    frequencyMhz: number(/^\s*freq:\s*(\d+(?:\.\d+)?)/m),
    bitrateMbps: number(/^\s*rx bitrate:\s*(\d+(?:\.\d+)?)\s*MBit\/s/m)
  };
};

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
  execFile = nodeExecFile,
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

  // Wireless interfaces have a `wireless` or `phy80211` entry in sysfs.
  const wireless = list(NET).filter((name) => (
    readText(path.posix.join(NET, name, 'operstate')) !== null &&
    list(path.posix.join(NET, name)).some((entry) => entry === 'wireless' || entry === 'phy80211')
  ));
  const exists = (file) => {
    try {
      return fs.statSync(file).isFile();
    } catch (err) {
      return false;
    }
  };
  const iw = IW.find(exists);
  let wifi = null;
  let wifiAt = -Infinity;
  let wifiPending = false;
  const refreshWifi = (at) => {
    if (!iw || !wireless.length || wifiPending || at - wifiAt < WIFI_INTERVAL_MS) {
      return;
    }
    wifiPending = true;
    const name = wireless[0];
    execFile(iw, ['dev', name, 'link'], { timeout: WIFI_TIMEOUT_MS }, (err, stdout) => {
      wifiPending = false;
      wifiAt = now();
      const link = err ? null : parseIwLink(String(stdout));
      wifi = link ? { interface: name, ...link } : { interface: name, ssid: null, signalDbm: null, frequencyMhz: null, bitrateMbps: null };
    });
  };
  const network = (at) => {
    refreshWifi(at);
    const interfaces = [];
    const all = os.networkInterfaces();
    Object.keys(all).sort().forEach((name) => {
      (all[name] || []).forEach((entry) => {
        if (!entry.internal && (entry.family === 'IPv4' || entry.family === 4)) {
          interfaces.push({ name, address: entry.address });
        }
      });
    });
    return { interfaces, wifi };
  };

  const mainTemperature = (list) => {
    const cpu = list.find((zone) => /cpu/i.test(zone.name));
    if (cpu) {
      return cpu.celsius;
    }
    return list.length ? Math.max(...list.map((zone) => zone.celsius)) : null;
  };

  let baseline = os.cpus().map(totals);
  let last = null;
  const history = { cpu: [], temperature: [] };
  let historyAt = null;

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
      network: network(at),
      uptime: Math.round(os.uptime()),
      server: { rss: mem.rss, heapUsed: mem.heapUsed, uptime: Math.round(processUptime()) },
      history: { interval: HISTORY_INTERVAL_MS / 1000, cpu: history.cpu, temperature: history.temperature }
    };
    return last;
  };

  const record = () => {
    const sample = read();
    if (sample.sampledAt === historyAt) {
      return;
    }
    historyAt = sample.sampledAt;
    // Copies, so a response already sent never changes under its reader.
    history.cpu = history.cpu.concat([sample.cpu]).slice(-HISTORY_LENGTH);
    history.temperature = history.temperature.concat([mainTemperature(sample.temperatures)]).slice(-HISTORY_LENGTH);
    sample.history = { interval: HISTORY_INTERVAL_MS / 1000, cpu: history.cpu, temperature: history.temperature };
  };

  let timer = null;
  const start = () => {
    if (timer) {
      return;
    }
    record();
    timer = setInterval(record, HISTORY_INTERVAL_MS);
    // The history must never keep CNCjs alive on its own.
    if (timer.unref) {
      timer.unref();
    }
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  return { read, record, start, stop };
};

export default createSystemStats;
