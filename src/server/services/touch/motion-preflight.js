// Read-only movement preparation for the touch interface. Nothing here writes
// to a controller: a successful preview describes the jog that *would* be
// sent, and is never an authorization to execute it later.

const AXES = ['X', 'Y', 'Z'];
const PREVIEW_KEYS = ['port', 'axis', 'direction', 'step', 'feed'];

// A status report older than this is not trusted to describe the machine.
const MAX_REPORT_AGE_MS = 2500;

// GrblRunner commits this state before emitting its status report. The
// controller's own copy is refreshed later and must never be paired with a
// newer report timestamp.
export const controllerStatus = (controller) => {
  const runner = controller && controller.runner;
  return (runner && runner.state && runner.state.status) || {};
};

// Errors carry a `code` so the API layer can map them to a status without
// matching on message text.
const failure = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

export const createPreflight = (store, config, sessionState, clock = Date.now) => {
  if (!store || typeof store.get !== 'function' ||
      !config || typeof config.get !== 'function' ||
      typeof sessionState !== 'function' || typeof clock !== 'function') {
    throw new TypeError('Dépendances serveur obligatoires.');
  }

  const observed = new Map();
  let disposed = false;

  // A controller destroyed by CNCjs has runner set to null: forget it anyway.
  const unwatch = (port) => {
    const record = observed.get(port);
    observed.delete(port);
    if (record && record.controller.runner) {
      record.controller.runner.removeListener('status', record.listener);
    }
  };

  // Returns the controller when it is ready for a dry run, otherwise throws
  // with a code naming what blocks it.
  const controller = (port) => {
    if (disposed) {
      throw failure('CLOSED', 'Préparation fermée.');
    }
    // eslint-disable-next-line no-control-regex
    if (typeof port !== 'string' || !port.length || port.length > 256 || /[\x00-\x1f]/.test(port)) {
      throw failure('PORT', 'Choisissez un contrôleur.');
    }

    const registry = store.get('controllers') || {};

    // A replacement instance must receive its own status report.
    for (const [key, record] of observed) {
      if (!Object.prototype.hasOwnProperty.call(registry, key) || registry[key] !== record.controller) {
        unwatch(key);
      }
    }

    const c = Object.prototype.hasOwnProperty.call(registry, port) && registry[port];
    if (!c || c.type !== 'Grbl' || !c.options || c.options.port !== port ||
        typeof c.isClose !== 'function' || c.isClose() || c.ready !== true) {
      unwatch(port);
      throw failure('CONNECTION', 'Contrôleur Grbl prêt et connecté requis.');
    }
    if (!c.runner || typeof c.runner.on !== 'function' || typeof c.runner.removeListener !== 'function') {
      throw failure('STATUS', 'Rapports du contrôleur indisponibles.');
    }

    if (!observed.has(port)) {
      const record = { controller: c, seen: null, listener: null };
      record.listener = () => {
        record.seen = clock();
      };
      c.runner.on('status', record.listener);
      observed.set(port, record);
    }

    const seen = observed.get(port).seen;
    const now = clock();
    if (!Number.isFinite(seen) || !Number.isFinite(now) || now < seen || now - seen > MAX_REPORT_AGE_MS) {
      throw failure('STALE', 'Attendre un rapport machine récent.');
    }
    if (!c.workflow || c.workflow.state !== 'idle' || controllerStatus(c).activeState !== 'Idle') {
      throw failure('BUSY', 'La machine doit être au repos (Idle).');
    }

    const feeder = c.feeder && typeof c.feeder.toJSON === 'function' && c.feeder.toJSON();
    if (!feeder || feeder.queue !== 0 || feeder.pending !== false) {
      throw failure('QUEUE', 'Une commande est en attente ou la file est inconnue.');
    }

    // This callback must read private server records, never client request fields.
    const session = sessionState(c);
    if (!session || session.loading !== false || session.confirmationPending !== false) {
      throw failure('SESSION', 'Un chargement ou une confirmation est en attente, ou leur état est inconnu.');
    }

    const events = config.get('events');
    if (!Array.isArray(events) || events.some((event) => !event || event.enabled !== false)) {
      throw failure('EVENTS', 'Automatismes CNCjs à vérifier.');
    }

    return c;
  };

  const inspect = (port) => {
    try {
      controller(port);
      return { dryRun: true, available: true, reason: '' };
    } catch (err) {
      return {
        dryRun: true,
        available: false,
        code: err.code || 'UNAVAILABLE',
        reason: err.code ? err.message : 'État serveur indisponible.'
      };
    }
  };

  const preview = (body) => {
    if (!body || Object.getPrototypeOf(body) !== Object.prototype ||
        Reflect.ownKeys(body).length !== PREVIEW_KEYS.length ||
        PREVIEW_KEYS.some((key) => !Object.prototype.hasOwnProperty.call(body, key)) ||
        !AXES.includes(body.axis) || ![-1, 1].includes(body.direction) ||
        ![0.1, 1, 10].includes(body.step) || ![200, 800, 1500].includes(body.feed)) {
      throw failure('INPUT', 'Axe, sens, pas ou vitesse invalide.');
    }

    const c = controller(body.port);

    // $110-$112: maximum rate per axis, as reported by the controller.
    const setting = '$' + (110 + AXES.indexOf(body.axis));
    const value = c.settings && c.settings.settings && c.settings.settings[setting];
    let maxFeed = NaN;
    if (typeof value === 'number') {
      maxFeed = value;
    } else if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)) {
      maxFeed = Number(value);
    }
    if (!Number.isFinite(maxFeed) || maxFeed <= 0) {
      throw failure('LIMIT', 'Vitesse maximale de cet axe indisponible.');
    }
    if (body.feed > maxFeed) {
      throw failure('FEED', 'Vitesse demandée supérieure à la limite ' + body.axis + ' (' + maxFeed + ' mm/min).');
    }

    const distanceMm = body.direction * body.step;

    return Object.freeze({
      dryRun: true,
      port: body.port,
      axis: body.axis,
      distanceMm,
      feedMmMin: body.feed,
      maxFeedMmMin: maxFeed,
      gcode: '$J=G21 G91 ' + body.axis + distanceMm + ' F' + body.feed
    });
  };

  const dispose = () => {
    for (const port of observed.keys()) {
      unwatch(port);
    }
    disposed = true;
  };

  return Object.freeze({ inspect, preview, dispose });
};
