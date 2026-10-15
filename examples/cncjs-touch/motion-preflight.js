'use strict';

// GrblRunner commits this state before emitting its status report. The controller
// copy is refreshed later and must never be paired with a newer report timestamp.
function controllerStatus(controller) {
  return controller && controller.runner && controller.runner.state && controller.runner.state.status || {};
}

// Offline preparation only. No controller command transport or HTTP route.
// A successful result is descriptive, never authorization to execute later.
function createPreflight(store, config, sessionState, clock = Date.now) {
  if (!store || typeof store.get !== 'function' || !config || typeof config.get !== 'function' ||
      typeof sessionState !== 'function' || typeof clock !== 'function') {
    throw new TypeError('Dépendances serveur obligatoires.');
  }
  const observed = new Map();
  let disposed = false;
  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
  function unwatch(port) {
    const r = observed.get(port);
    if (r) r.controller.runner.removeListener('status', r.listener);
    observed.delete(port);
  }
  function controller(port) {
    if (disposed) fail('CLOSED', 'Préparation fermée.');
    if (typeof port !== 'string' || !port.length || port.length > 256 || /[\x00-\x1f]/.test(port)) {
      fail('PORT', 'Choisissez un contrôleur.');
    }
    const registry = store.get('controllers') || {};
    // A replacement instance must receive its own status report.
    for (const [key, r] of observed) {
      if (!Object.prototype.hasOwnProperty.call(registry, key) || registry[key] !== r.controller) unwatch(key);
    }
    const c = Object.prototype.hasOwnProperty.call(registry, port) && registry[port];
    if (!c || c.type !== 'Grbl' || !c.options || c.options.port !== port ||
        typeof c.isClose !== 'function' || c.isClose() || c.ready !== true) {
      unwatch(port);
      fail('CONNECTION', 'Contrôleur Grbl prêt et connecté requis.');
    }
    if (!c.runner || typeof c.runner.on !== 'function' || typeof c.runner.removeListener !== 'function') {
      fail('STATUS', 'Rapports du contrôleur indisponibles.');
    }
    if (!observed.has(port)) {
      const r = { controller: c, seen: null, listener: null };
      r.listener = () => { r.seen = clock(); };
      c.runner.on('status', r.listener);
      observed.set(port, r);
    }
    const seen = observed.get(port).seen, now = clock();
    if (!Number.isFinite(seen) || !Number.isFinite(now) || now < seen || now - seen > 2500) {
      fail('STALE', 'Attendre un rapport machine récent.');
    }
    if (!c.workflow || c.workflow.state !== 'idle' || controllerStatus(c).activeState !== 'Idle') {
      fail('BUSY', 'La machine doit être au repos (Idle).');
    }
    const feeder = c.feeder && typeof c.feeder.toJSON === 'function' && c.feeder.toJSON();
    if (!feeder || feeder.queue !== 0 || feeder.pending !== false) {
      fail('QUEUE', 'Une commande est en attente ou la file est inconnue.');
    }
    // This callback must read private server records, never client request fields.
    const session = sessionState(c);
    if (!session || session.loading !== false || session.confirmationPending !== false) {
      fail('SESSION', 'Un chargement ou une confirmation est en attente, ou leur état est inconnu.');
    }
    const events = config.get('events');
    if (!Array.isArray(events) || events.some(event => !event || event.enabled !== false)) {
      fail('EVENTS', 'Automatismes CNCjs à vérifier.');
    }
    return c;
  }
  function inspect(port) {
    try {
      controller(port);
      return { dryRun: true, available: true, reason: '' };
    } catch (error) {
      return { dryRun: true, available: false, code: error.code || 'UNAVAILABLE',
        reason: error.code ? error.message : 'État serveur indisponible.' };
    }
  }
  function preview(body) {
    const keys = ['port', 'axis', 'direction', 'step', 'feed'];
    if (!body || Object.getPrototypeOf(body) !== Object.prototype ||
        Reflect.ownKeys(body).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(body, key)) ||
        !['X', 'Y', 'Z'].includes(body.axis) || ![-1, 1].includes(body.direction) ||
        ![0.1, 1, 10].includes(body.step) || ![200, 800, 1500].includes(body.feed)) {
      fail('INPUT', 'Axe, sens, pas ou vitesse invalide.');
    }
    const c = controller(body.port);
    const setting = '$' + (110 + ['X', 'Y', 'Z'].indexOf(body.axis));
    const value = c.settings && c.settings.settings && c.settings.settings[setting];
    const maxFeed = typeof value === 'number' ? value :
      typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
    if (!Number.isFinite(maxFeed) || maxFeed <= 0) fail('LIMIT', 'Vitesse maximale de cet axe indisponible.');
    if (body.feed > maxFeed) fail('FEED', 'Vitesse demandée supérieure à la limite ' + body.axis + ' (' + maxFeed + ' mm/min).');
    const distanceMm = body.direction * body.step;
    return Object.freeze({ dryRun: true, port: body.port, axis: body.axis, distanceMm,
      feedMmMin: body.feed, maxFeedMmMin: maxFeed,
      gcode: '$J=G21 G91 ' + body.axis + distanceMm + ' F' + body.feed });
  }
  function dispose() {
    for (const port of observed.keys()) unwatch(port);
    disposed = true;
  }
  return Object.freeze({ inspect, preview, dispose });
}

module.exports = { createPreflight, controllerStatus };
