'use strict';

// Passive diagnostic only: consumes CNCjs status events, never queries or commands Grbl.
// Use raw reports: this CNCjs runner fills missing pinState with an empty string.
function createProbeInput(store, clock = Date.now) {
  const observed = new Map();
  function remove(port) {
    const r = observed.get(port);
    if (r) {
      r.controller.runner.removeListener('status', r.status);
      r.controller.runner.removeListener('startup', r.reset);
    }
    observed.delete(port);
  }
  function sync() {
    const registry = store.get('controllers') || {};
    for (const [port, r] of observed) {
      if (!Object.prototype.hasOwnProperty.call(registry, port) || registry[port] !== r.controller || r.controller.isClose()) remove(port);
    }
    return registry;
  }
  function inspect(port) {
    const registry = sync(), c = Object.prototype.hasOwnProperty.call(registry, port) && registry[port];
    const result = { state: 'unknown', code: 'CONNECTION', reason: 'Contrôleur Grbl déconnecté ou indisponible.',
      fresh: false, ageMs: null, observedAt: null, source: 'Grbl Pn', readOnly: true, canProbe: false };
    if (!c || c.type !== 'Grbl' || !c.options || c.options.port !== port || c.isClose() || c.ready !== true || !c.runner) {
      remove(port); return result;
    }
    if (!observed.has(port)) {
      const r = { controller: c, seen: null, state: 'unknown', code: 'WAITING' };
      r.reset = () => { r.seen = null; r.state = 'unknown'; r.code = 'WAITING'; };
      r.status = report => {
        r.seen = clock(); r.state = 'unknown'; r.code = 'MALFORMED';
        const raw = report && report.raw;
        // Only modern, pipe-separated reports are interpreted. PRB is never read.
        if (typeof raw !== 'string' || raw.length > 2048 || !/^<(?:Idle|Run|Hold(?::\d+)?|Jog|Alarm|Door(?::\d+)?|Check|Home|Sleep)\|[^<>\r\n]+>$/.test(raw)) return;
        const fields = raw.slice(1, -1).split('|').slice(1), pins = fields.filter(f => /^Pn(?::|$)/.test(f));
        if (!pins.length) { r.code = 'MISSING'; return; }
        if (pins.length !== 1 || !/^Pn:[XYZPDHRS]+$/.test(pins[0])) return;
        const value = pins[0].slice(3);
        if (new Set(value).size !== value.length) return;
        r.state = value.includes('P') ? 'contact' : 'free'; r.code = 'EXPLICIT';
      };
      observed.set(port, r); c.runner.on('status', r.status); c.runner.on('startup', r.reset);
    }
    const r = observed.get(port), now = clock();
    result.observedAt = Number.isFinite(r.seen) ? r.seen : null;
    result.ageMs = Number.isFinite(now) && result.observedAt !== null && now >= r.seen ? now - r.seen : null;
    if (result.ageMs === null || result.ageMs > 2500) {
      result.code = r.seen === null ? 'WAITING' : 'STALE';
      result.reason = r.seen === null ? 'En attente d’un nouveau rapport Grbl.' : 'Rapport trop ancien : entrée sonde inconnue.';
      return result;
    }
    result.fresh = true; result.state = r.state; result.code = r.code;
    result.reason = r.code === 'EXPLICIT' ? (r.state === 'contact' ? 'Contact signalé par le champ Pn du rapport Grbl.' : 'Champ Pn explicite : entrée P non active.') :
      r.code === 'MISSING' ? 'Champ Pn absent : entrée libre non confirmée. Capacité du firmware à valider.' : 'Rapport sonde non reconnu : état inconnu.';
    return result;
  }
  return { inspect, sync, dispose: () => { for (const port of observed.keys()) remove(port); } };
}
module.exports = { createProbeInput };
