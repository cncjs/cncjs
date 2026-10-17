// Job service for the touch interface: load, start, pause, resume and stop a
// program on a connected Grbl controller, with every state-changing action
// re-checked against a fresh controller report. Start and resume additionally
// require a short-lived confirmation ticket bound to the client's event
// stream, so a stale page or a replayed request cannot move the machine.
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
// Explicit extensions: examples/cncjs-touch/preview-server.cjs loads this
// module with Node's native ES module loader, outside of Babel.
// eslint-disable-next-line import/extensions
import { createPreflight, controllerStatus } from './motion-preflight.js';
// eslint-disable-next-line import/extensions
import { createProbeInput } from './probe-input.js';

// A status report older than this is not trusted to describe the machine.
const MAX_REPORT_AGE_MS = 2500;

// A start/resume confirmation must be used within this window.
const TICKET_LIFETIME_MS = 15000;

const MAX_FILE_SIZE = 20 * 1048576;

// Grbl settings exposed to the client: report mask/units, max rates, max
// accelerations, travel limits and spindle range. The full list ($$) is only
// sent on request, for the commissioning backup.
const EXPOSED_SETTINGS = [20, 21, 22, 30, 31, 32, 110, 111, 112, 120, 121, 122, 130, 131, 132];

// Commissioning spindle test: the minimum speed ($31), or a quarter of the
// maximum ($30) when no minimum is set.
const settingNumber = (settings, n) => {
  const v = Number(settings['$' + n]);
  return Number.isFinite(v) ? v : null;
};
export const spindleTestSpeed = (settings) => {
  const max = settingNumber(settings, 30);
  const min = settingNumber(settings, 31);
  if (!max || max <= 0) {
    return null;
  }
  const speed = min && min > 0 && min <= max ? min : max / 4;
  return Math.round(speed);
};

// Every numeric setting read from $$, nothing else.
const allSettings = (c) => {
  const source = (c.settings && c.settings.settings) || {};
  const out = {};
  Object.keys(source).filter((k) => /^\$\d{1,4}$/.test(k)).forEach((k) => {
    const v = source[k];
    if ((typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length < 32)) {
      out[k] = v;
    }
  });
  return out;
};

const firmwareOf = (c) => {
  const v = c.settings && c.settings.version;
  return typeof v === 'string' && v.length < 64 ? v : '';
};

// Realtime override steps accepted by the Grbl controller commands
// (feedOverride / spindleOverride: reset, ±10 %, ±1 %; rapidOverride: 100/50/25 %).
const OVERRIDES = {
  feed: [0, 10, -10, 1, -1],
  spindle: [0, 10, -10, 1, -1],
  rapid: [0, 100, 50, 25]
};

// Grbl reports the active overrides as Ov:feed,rapid,spindle percentages.
const overridesOf = (state) => {
  const ov = state.ov;
  if (!Array.isArray(ov) || ov.length !== 3 || !ov.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return null;
  }
  return { feed: ov[0], rapid: ov[1], spindle: ov[2] };
};

// Words that select or change the work offset; comments are ignored.
export const changesOffset = (gcode) => {
  const code = String(gcode).replace(/\([^)]*\)/g, ' ').replace(/;.*$/gm, ' ');
  return /(?<![A-Z])G\s*0*(?:5[4-9](?:\.\d)?|10|92(?:\.\d)?)(?![\d.])/i.test(code);
};

// Grbl reports the real feed rate and spindle speed as FS:feed,speed; CNCjs
// keeps them as status.feedrate and status.spindle.
const realtimeValue = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);

// Only names and ids leave the server; macro contents stay in the configuration.
const macrosOf = (config) => {
  return (config.get('macros') || [])
    .filter((m) => m && typeof m.id === 'string' && typeof m.name === 'string')
    .map((m) => ({ id: m.id, name: m.name }));
};

// Errors carry an HTTP status so the API layer can answer without matching on
// message text.
const conflict = (message) => {
  const err = new Error(message);
  err.status = 409;
  return err;
};

const hasAutomations = (config) => {
  return (config.get('events') || []).some((event) => event.enabled !== false);
};

export const createService = (store, config, clock = Date.now) => {
  const records = new Map();
  const listeners = new Set();
  const transports = new Set();
  let disposed = false;

  const changed = () => {
    listeners.forEach((fn) => fn());
  };

  const controllers = () => store.get('controllers') || {};

  const record = (c) => {
    if (!records.has(c)) {
      const r = {
        seen: null,
        modalSeen: null,
        wcs: null,
        job: null,
        loading: false,
        ticket: null,
        // Firmware seen in the startup banner or a $I reply, and how many
        // times the board restarted (an E-stop wired to reset restarts it).
        firmware: '',
        startups: 0,
        generation: crypto.randomBytes(12).toString('hex')
      };
      r.status = () => {
        r.seen = clock();
        changed();
      };
      r.reset = (payload) => {
        r.seen = null;
        r.modalSeen = null;
        r.wcs = null;
        r.ticket = null;
        r.startups += 1;
        if (payload && typeof payload.firmware === 'string' && typeof payload.version === 'string') {
          r.firmware = (payload.firmware + ' ' + payload.version).slice(0, 63);
        }
        changed();
      };
      // [VER:1.1h.20190825:] from $I, which CNCjs does not keep.
      r.raw = (payload) => {
        const m = payload && typeof payload.raw === 'string' && /^\[VER:([^\]:]{1,40})[^\]]*\]$/.exec(payload.raw.trim());
        if (m && r.firmware.indexOf(m[1]) < 0) {
          r.firmware = 'Grbl ' + m[1];
          changed();
        }
      };
      // GrblRunner initializes G54 before receiving $G: accept only an observed report.
      r.modal = (payload) => {
        r.modalSeen = clock();
        const value = payload && payload.modal && payload.modal.wcs;
        r.wcs = /^G5[4-9]$/.test(value || '') ? value : null;
        changed();
      };
      r.file = () => {
        r.job = null;
        r.ticket = null;
        changed();
      };
      c.runner.on('status', r.status);
      c.runner.on('startup', r.reset);
      c.runner.on('parserstate', r.modal);
      c.runner.on('raw', r.raw);
      // CNCjs rewinds the sender when a program ends, so "all lines acknowledged"
      // must be remembered when it happens to tell a finished job from a stopped one.
      r.end = () => {
        if (r.job && r.job.started && !r.job.stopped) {
          r.job.finishedAt = clock();
          changed();
        }
      };
      c.sender.on('load', r.file);
      c.sender.on('unload', r.file);
      c.sender.on('end', r.end);
      records.set(c, r);
    }
    return records.get(c);
  };

  // CNCjs sets runner and sender to null when it destroys a controller (port
  // closed or gone, e.g. a USB cable pulled): forget the record in any case,
  // otherwise every later snapshot would fail on the same dead controller.
  const modalWcs = (r) => {
    const fresh = Number.isFinite(r.modalSeen) && clock() >= r.modalSeen && clock() - r.modalSeen <= MAX_REPORT_AGE_MS;
    return fresh ? r.wcs : null;
  };

  const remove = (c, r) => {
    records.delete(c);
    if (c.runner) {
      c.runner.removeListener('status', r.status);
      c.runner.removeListener('startup', r.reset);
      c.runner.removeListener('parserstate', r.modal);
      c.runner.removeListener('raw', r.raw);
    }
    if (c.sender) {
      c.sender.removeListener('load', r.file);
      c.sender.removeListener('unload', r.file);
      c.sender.removeListener('end', r.end);
    }
  };

  const probeInput = createProbeInput(store, clock);
  const motion = createPreflight(store, config, (c) => {
    const r = record(c);
    return {
      loading: r.loading,
      confirmationPending: !!r.ticket && clock() <= r.ticket.expires
    };
  }, clock);

  const get = (port) => {
    if (disposed) {
      throw conflict('Service indisponible.');
    }
    const registry = controllers();
    const c = Object.prototype.hasOwnProperty.call(registry, port) && registry[port];
    if (!c || c.isClose() || c.type !== 'Grbl') {
      throw conflict('Contrôleur Grbl non connecté.');
    }
    return c;
  };

  const available = (c) => {
    if (controllers()[c.options.port] !== c || c.isClose() || !c.ready || !c.runner || !c.sender) {
      throw conflict('Connexion machine indisponible.');
    }
    const r = record(c);
    if (!Number.isFinite(r.seen) || clock() < r.seen || clock() - r.seen > MAX_REPORT_AGE_MS) {
      throw conflict('État machine trop ancien : attendre un rapport récent.');
    }
  };

  const idle = (c) => {
    available(c);
    const feeder = c.feeder.toJSON();
    if (c.workflow.state !== 'idle' || controllerStatus(c).activeState !== 'Idle' || feeder.queue || feeder.pending) {
      throw conflict('La machine doit être au repos (Idle), sans commande en attente.');
    }
  };

  const validJob = (c, revision) => {
    const j = record(c).job;
    if (!j || j.revision !== revision ||
        c.sender.state.context.touchJob !== j.revision || c.sender.state.name !== j.name) {
      throw conflict('Le fichier chargé a changé. Rechargez-le et confirmez à nouveau.');
    }
    return j;
  };

  // CNCjs appends "%wait" to every loaded program and holds the sender with that
  // reason while it runs; a pause made then keeps the %wait reason. Only a
  // pause the program itself asked for (M0, M1, M6...) must be resumed in CNCjs.
  const programPause = (c) => {
    const reason = c.sender.state.holdReason;
    return Boolean(reason) && !(reason && reason.data === '%wait');
  };

  // Grbl reports the spindle speed in FS:; it is 0 once M5 is executed.
  const spindleStill = (c) => {
    const speed = realtimeValue(controllerStatus(c).spindle);
    if (speed !== null && speed > 0) {
      throw conflict('La broche tourne encore (' + speed + ' tr/min) : arrêtez-la d’abord (M5).');
    }
  };

  const readyFor = (c, action, revision) => {
    const j = validJob(c, revision);
    available(c);
    if (action === 'start') {
      idle(c);
      spindleStill(c);
      if (record(c).loading) {
        throw conflict('Chargement en cours.');
      }
      if (j.started || !c.sender.state.total) {
        throw conflict('Rechargez le fichier avant un nouveau démarrage.');
      }
    } else if (!j.started || c.workflow.state !== 'paused' ||
        controllerStatus(c).activeState !== 'Hold' || programPause(c)) {
      throw conflict('La reprise exige une pause simple confirmée par la machine.');
    }
    if (hasAutomations(config)) {
      throw conflict('Des automatismes CNCjs sont configurés. Leur compatibilité doit être vérifiée avant utilisation.');
    }
    return j;
  };

  // Overrides act on the running (or held) program only.
  const overridable = (c) => {
    available(c);
    if (!['running', 'paused'].includes(c.workflow.state)) {
      throw conflict('Les corrections s’appliquent pendant un travail en cours ou en pause.');
    }
  };

  // A macro moves the machine from rest: idle, nothing loading, no automations.
  const macroReady = (c) => {
    idle(c);
    spindleStill(c);
    if (record(c).loading) {
      throw conflict('Chargement en cours.');
    }
    if (hasAutomations(config)) {
      throw conflict('Des automatismes CNCjs sont configurés. Leur compatibilité doit être vérifiée avant utilisation.');
    }
  };

  // Commissioning commands ($X, $H, spindle test) never run during a job.
  const noJob = (c) => {
    available(c);
    const feeder = c.feeder.toJSON();
    if (c.workflow.state !== 'idle' || feeder.queue || feeder.pending) {
      throw conflict('Impossible pendant un travail ou avec des commandes en attente.');
    }
    if (record(c).loading) {
      throw conflict('Chargement en cours.');
    }
  };

  const unlockReady = (c) => {
    noJob(c);
    if (!/^Alarm/.test(controllerStatus(c).activeState || '')) {
      throw conflict('Le déverrouillage ($X) ne sert qu’en alarme.');
    }
  };

  const homeReady = (c) => {
    noJob(c);
    const state = controllerStatus(c).activeState || '';
    if (state !== 'Idle' && !/^Alarm/.test(state)) {
      throw conflict('La prise d’origine exige une machine au repos ou en alarme.');
    }
    spindleStill(c);
    const homing = settingNumber(allSettings(c), 22);
    if (homing === null) {
      throw conflict('Réglage $22 inconnu : relisez les réglages de la carte.');
    }
    if (homing === 0) {
      throw conflict('Prise d’origine désactivée sur la carte ($22=0).');
    }
    if (hasAutomations(config)) {
      throw conflict('Des automatismes CNCjs sont configurés. Leur compatibilité doit être vérifiée avant utilisation.');
    }
  };

  const spindleStopReady = (c) => {
    if (controllers()[c.options.port] !== c || c.isClose() || !c.ready) {
      throw conflict('Connexion machine indisponible.');
    }
    if (c.workflow.state !== 'idle') {
      throw conflict('Pendant un travail, utilisez Pause ou Arrêter.');
    }
  };

  const spindleReady = (c) => {
    idle(c);
    noJob(c);
    if (!spindleTestSpeed(allSettings(c))) {
      throw conflict('Vitesse maximale de broche ($30) inconnue : relisez les réglages de la carte.');
    }
    if (hasAutomations(config)) {
      throw conflict('Des automatismes CNCjs sont configurés. Leur compatibilité doit être vérifiée avant utilisation.');
    }
  };

  const findMacro = (id) => {
    const macro = macrosOf(config).find((m) => m.id === id);
    if (!macro) {
      throw conflict('Macro introuvable. Actualisez la liste.');
    }
    return macro;
  };

  // Confirmed commissioning operations: guard (checked at prepare and again at
  // run time), the name shown in the confirmation, and the command sent.
  const COMMISSIONING = {
    unlock: {
      guard: unlockReady,
      name: () => 'Déverrouillage ($X)',
      run: (c) => {
        unlockReady(c);
        c.command('unlock');
        return { message: 'Déverrouillage ($X) envoyé. Vérifiez le retour à Idle.' };
      }
    },
    home: {
      guard: homeReady,
      name: () => 'Prise d’origine ($H)',
      run: (c) => {
        homeReady(c);
        c.command('homing');
        return { message: 'Prise d’origine ($H) lancée. Main sur l’arrêt d’urgence.' };
      }
    },
    spindle: {
      guard: spindleReady,
      name: (c) => 'Test broche M3 S' + spindleTestSpeed(allSettings(c)),
      run: (c, t) => {
        spindleReady(c);
        const speed = spindleTestSpeed(allSettings(c));
        if (speed !== t.speed) {
          throw conflict('La vitesse de test a changé depuis la confirmation. Confirmez à nouveau.');
        }
        c.command('gcode', 'M3 S' + speed);
        return { message: 'Broche démarrée à ' + speed + ' tr/min (M3). Arrêt : bouton Arrêter la broche.' };
      }
    }
  };

  // Runs a guard and returns its failure message, or '' when it passes.
  const reason = (guard) => {
    try {
      guard();
      return '';
    } catch (err) {
      return err.message;
    }
  };

  const snapshot = (c) => {
    const r = record(c);
    const sender = c.sender.toJSON();
    const state = controllerStatus(c);
    const motionState = motion.inspect(c.options.port);
    const revision = r.job && r.job.revision;

    const loadReason = reason(() => {
      idle(c);
      if (r.loading) {
        throw conflict('Chargement en cours.');
      }
    });
    const startReason = reason(() => readyFor(c, 'start', revision));
    const resumeReason = reason(() => readyFor(c, 'resume', revision));
    const overrideReason = reason(() => overridable(c));
    const macroReason = reason(() => macroReady(c));
    const unlockReason = reason(() => unlockReady(c));
    const homeReason = reason(() => homeReady(c));
    const spindleReason = reason(() => spindleReady(c));
    const spindleStopReason = reason(() => spindleStopReady(c));

    const age = (Number.isFinite(r.seen) && clock() >= r.seen) ? clock() - r.seen : null;

    const source = (c.settings && c.settings.settings) || {};
    const settings = {};
    EXPOSED_SETTINGS.forEach((n) => {
      const v = source['$' + n];
      if ((typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length < 32)) {
        settings['$' + n] = v;
      }
    });

    const coordinates = {};
    ['wpos', 'mpos'].forEach((kind) => {
      coordinates[kind] = {};
      ['x', 'y', 'z'].forEach((axis) => {
        const v = state[kind] && state[kind][axis];
        if ((typeof v === 'number' && Number.isFinite(v)) ||
            (typeof v === 'string' && v.length < 32 && Number.isFinite(Number(v)))) {
          coordinates[kind][axis] = v;
        }
      });
    });

    const reportSetting = source.$13;
    let reportUnits = null;
    if (reportSetting === 0 || reportSetting === '0') {
      reportUnits = 'mm';
    } else if (reportSetting === 1 || reportSetting === '1') {
      reportUnits = 'in';
    }
    let wcs = modalWcs(r);
    // While a program that cannot change the offset runs, the offset seen at its start holds.
    if (!wcs && r.job && r.job.started && !r.job.changesOffset && r.job.wcsAtStart &&
        ['running', 'paused'].includes(c.workflow.state)) {
      wcs = r.job.wcsAtStart;
    }

    return {
      port: c.options.port,
      controllerId: c.options.port,
      generation: r.generation,
      operator: { reportUnits, wcs },
      type: c.type,
      activeState: state.activeState || '',
      feedrate: realtimeValue(state.feedrate),
      spindleSpeed: realtimeValue(state.spindle),
      workflow: c.workflow.state,
      statusAgeMs: age,
      statusObservedAt: r.seen,
      coordinates,
      settings,
      fresh: age !== null && age <= MAX_REPORT_AGE_MS,
      name: sender.name || '',
      revision,
      originalName: r.job && r.job.originalName,
      total: sender.total,
      sent: sender.sent,
      received: sender.received,
      probeInput: probeInput.inspect(c.options.port),
      loading: r.loading,
      canPreviewMotion: motionState.available,
      motionReason: motionState.reason,
      canLoad: !loadReason,
      loadReason,
      canStart: !startReason,
      startReason,
      canResume: !resumeReason,
      resumeReason,
      // Every line acknowledged and the program over (not stopped by the operator).
      finished: Boolean(r.job && r.job.finishedAt && !r.job.stopped && c.workflow.state === 'idle'),
      canPause: c.workflow.state === 'running',
      canStop: c.workflow.state !== 'idle' || ['Run', 'Hold', 'Home', 'Jog'].includes(state.activeState),
      overrides: overridesOf(state),
      canOverride: !overrideReason,
      overrideReason,
      macros: macrosOf(config),
      canMacro: !macroReason,
      macroReason,
      // Commissioning: firmware banner, whether $$ was read, guarded $X / $H / spindle test.
      firmware: r.firmware || firmwareOf(c),
      startups: r.startups,
      settingsCount: Object.keys(allSettings(c)).length,
      canUnlock: !unlockReason,
      unlockReason,
      canHome: !homeReason,
      homeReason,
      canSpindleTest: !spindleReason,
      spindleReason,
      spindleTestSpeed: spindleTestSpeed(allSettings(c)),
      canSpindleStop: !spindleStopReason
    };
  };

  // Reads a program from the watch directory and hands it to the controller.
  // The file must sit directly in the watch directory and must not change
  // while it is read.
  const load = async (c, r, body) => {
    idle(c);
    if (r.loading) {
      throw conflict('Un chargement est déjà en cours.');
    }
    if (typeof body.file !== 'string' || body.file !== path.basename(body.file) ||
        /[\\/\0]/.test(body.file) || !/\.(nc|gcode|ngc|tap|cnc|txt)$/i.test(body.file)) {
      throw conflict('Nom de fichier invalide.');
    }

    r.loading = true;
    r.ticket = null;
    try {
      const root = await fs.realpath(config.get('watchDirectory'));
      const file = await fs.realpath(path.join(root, body.file));
      if (path.dirname(file) !== root) {
        throw conflict('Fichier hors de la bibliothèque.');
      }
      const before = await fs.stat(file);
      if (!before.isFile() || before.size === 0 || before.size > MAX_FILE_SIZE) {
        throw conflict('Fichier vide ou supérieur à 20 Mo.');
      }
      const buffer = await fs.readFile(file);
      const after = await fs.stat(file);
      if (before.mtimeMs !== after.mtimeMs || before.ino !== after.ino ||
          buffer.length !== before.size || buffer.includes(0)) {
        throw conflict('Fichier modifié pendant la lecture ou format invalide.');
      }
      const gcode = buffer.toString('utf8');
      // CNCjs % directives execute expressions; this library accepts plain G-code only.
      if (/^[ \t]*%[ \t]*[^\r\n \t]/m.test(gcode)) {
        throw conflict('Les directives CNCjs % ne sont pas acceptées par cette bibliothèque.');
      }

      // Recheck after asynchronous disk access, before replacing the loaded job.
      idle(c);
      if (hasAutomations(config)) {
        throw conflict('Automatismes CNCjs à vérifier avant chargement.');
      }

      const revision = crypto.randomBytes(20).toString('hex');
      await new Promise((resolve, reject) => {
        c.command('gcode:load', body.file, gcode, { touchJob: revision }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      r.job = {
        revision,
        name: body.file,
        originalName: body.file.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/, ''),
        started: false,
        // G54-G59.x select, G10 L2/L20 and G92 change the work offset.
        changesOffset: changesOffset(gcode),
        wcsAtStart: null
      };
      return { message: 'Fichier chargé dans CNCjs. Aucun démarrage envoyé.' };
    } finally {
      r.loading = false;
      changed();
    }
  };

  const perform = (body) => {
    if (!body || typeof body.port !== 'string') {
      throw conflict('Choisissez une machine.');
    }
    const c = get(body.port);
    const r = record(c);
    const a = body.action;

    if (['prepare', 'start', 'resume', 'macro', 'override', 'unlock', 'home', 'spindle', 'readSettings'].includes(a)) {
      if (typeof body.generation !== 'string' || body.generation !== r.generation) {
        throw conflict('Le contrôleur a changé ou son identité manque. Choisissez-le à nouveau.');
      }
      if (typeof body.transportId !== 'string' || !transports.has(body.transportId)) {
        throw conflict('Connexion de suivi interrompue. Confirmez à nouveau.');
      }
    }
    const stopping = ['pause', 'stop', 'spindleStop'].includes(a);
    if (body.generation !== undefined && body.generation !== r.generation && !stopping) {
      throw conflict('Le contrôleur a changé. Choisissez-le à nouveau.');
    }
    if (body.transportId !== undefined && !transports.has(body.transportId) && !stopping) {
      throw conflict('Connexion de suivi interrompue. Confirmez à nouveau.');
    }

    if (a === 'load') {
      return load(c, r, body);
    }

    if (a === 'settings') {
      return { firmware: r.firmware || firmwareOf(c), settings: allSettings(c) };
    }

    if (a === 'readSettings') {
      idle(c);
      noJob(c);
      c.command('gcode', record(c).firmware ? '$$' : ['$I', '$$']);
      return { message: 'Lecture des réglages ($$) demandée.' };
    }

    if (a === 'prepare') {
      if (!['start', 'resume', 'macro', 'unlock', 'home', 'spindle'].includes(body.operation)) {
        throw conflict('Action invalide.');
      }
      const nonce = crypto.randomBytes(24).toString('hex');
      let name;
      if (COMMISSIONING[body.operation]) {
        const op = COMMISSIONING[body.operation];
        op.guard(c);
        name = op.name(c);
        r.ticket = {
          nonce,
          operation: body.operation,
          speed: body.operation === 'spindle' ? spindleTestSpeed(allSettings(c)) : undefined,
          expires: clock() + TICKET_LIFETIME_MS,
          transportId: body.transportId
        };
      } else if (body.operation === 'macro') {
        macroReady(c);
        const macro = findMacro(body.macroId);
        name = macro.name;
        r.ticket = { nonce, macroId: macro.id, operation: 'macro', expires: clock() + TICKET_LIFETIME_MS, transportId: body.transportId };
      } else {
        const j = readyFor(c, body.operation, body.revision);
        name = j.originalName;
        r.ticket = { nonce, revision: j.revision, operation: body.operation, expires: clock() + TICKET_LIFETIME_MS, transportId: body.transportId };
      }
      return {
        nonce,
        name,
        operation: body.operation,
        expiresIn: TICKET_LIFETIME_MS / 1000,
        generation: r.generation
      };
    }

    if (a === 'macro') {
      const t = r.ticket;
      r.ticket = null;
      if (!t || t.nonce !== body.nonce || t.operation !== 'macro' || clock() > t.expires || t.transportId !== body.transportId) {
        throw conflict('Confirmation expirée ou déjà utilisée.');
      }
      macroReady(c);
      const macro = findMacro(t.macroId);
      return new Promise((resolve, reject) => {
        c.command('macro:run', macro.id, {}, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ message: 'Macro « ' + macro.name + ' » envoyée au contrôleur.' });
          }
        });
      });
    }

    if (COMMISSIONING[a]) {
      const t = r.ticket;
      r.ticket = null;
      if (!t || t.nonce !== body.nonce || t.operation !== a || clock() > t.expires || t.transportId !== body.transportId) {
        throw conflict('Confirmation expirée ou déjà utilisée.');
      }
      return COMMISSIONING[a].run(c, t);
    }

    if (a === 'spindleStop') {
      spindleStopReady(c);
      c.command('gcode', 'M5');
      return { message: 'Arrêt broche (M5) envoyé.' };
    }

    if (a === 'override') {
      const steps = Object.prototype.hasOwnProperty.call(OVERRIDES, body.kind) && OVERRIDES[body.kind];
      if (!steps || !steps.includes(body.value)) {
        throw conflict('Correction invalide.');
      }
      overridable(c);
      c.command(body.kind + 'Override', body.value);
      const label = { feed: 'avance', spindle: 'broche', rapid: 'rapide' }[body.kind];
      let change = 'remise à 100 %';
      if (body.kind === 'rapid' && body.value !== 0 && body.value !== 100) {
        change = body.value + ' %';
      } else if (body.kind !== 'rapid' && body.value !== 0) {
        change = (body.value > 0 ? '+' : '') + body.value + ' %';
      }
      return { message: 'Correction ' + label + ' : ' + change + '.' };
    }

    if (a === 'start' || a === 'resume') {
      const t = r.ticket;
      r.ticket = null;
      if (!t || t.nonce !== body.nonce || t.operation !== a || clock() > t.expires || t.transportId !== body.transportId) {
        throw conflict('Confirmation expirée ou déjà utilisée.');
      }
      const j = readyFor(c, a, t.revision);
      if (a === 'start') {
        j.wcsAtStart = modalWcs(r);
      }
      j.started = true;
      c.command(a === 'start' ? 'gcode:start' : 'gcode:resume');
      return { message: a === 'start' ? 'Démarrage demandé.' : 'Reprise demandée.' };
    }

    if (a === 'pause') {
      if (c.workflow.state !== 'running') {
        throw conflict('Aucun travail en cours.');
      }
      r.ticket = null;
      c.command('gcode:pause');
      return { message: 'Pause demandée. Attendre l’état Hold.' };
    }

    if (a === 'stop') {
      const activeState = controllerStatus(c).activeState;
      if (c.workflow.state === 'idle' && activeState === 'Jog') {
        r.ticket = null;
        c.command('jogCancel');
        return { message: 'Déplacement annulé.' };
      }
      // CNCjs's stop only acts in Run or Hold; a homing cycle needs a soft reset
      // (Grbl then asks for a new homing or $X).
      if (c.workflow.state === 'idle' && activeState === 'Home') {
        r.ticket = null;
        c.command('reset');
        return { message: 'Prise d’origine interrompue (réinitialisation). La carte demandera $H ou $X.' };
      }
      if (c.workflow.state === 'idle' && !['Run', 'Hold'].includes(activeState)) {
        throw conflict('Aucun travail à arrêter.');
      }
      r.ticket = null;
      if (r.job) {
        r.job.started = true;
        r.job.stopped = true;
        r.job.finishedAt = null;
      }
      c.command('gcode:stop', { force: true });
      return { message: 'Arrêt demandé. Vérifiez l’immobilisation ; ce bouton ne remplace pas l’arrêt physique.' };
    }

    throw conflict('Action inconnue.');
  };

  // perform() starts synchronously, so a pending load is visible to the very
  // next snapshot; every refusal still reaches the caller as a rejection.
  const action = (body) => {
    try {
      return Promise.resolve(perform(body));
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const list = () => {
    if (disposed) {
      throw conflict('Service indisponible.');
    }
    const registry = controllers();
    for (const [c, r] of records) {
      if (registry[c.options.port] !== c || c.isClose()) {
        motion.inspect(c.options.port);
        remove(c, r);
      }
    }
    probeInput.sync();
    return Object.values(registry)
      .filter((c) => c && !c.isClose() && c.type === 'Grbl')
      .map(snapshot);
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const openTransport = (id) => {
    transports.add(id);
  };

  const ticketPending = (id) => {
    for (const r of records.values()) {
      if (r.ticket && r.ticket.transportId === id && clock() <= r.ticket.expires) {
        return true;
      }
    }
    return false;
  };

  // Closing a transport revokes every confirmation it was issued.
  const closeTransport = (id) => {
    transports.delete(id);
    records.forEach((r) => {
      if (r.ticket && r.ticket.transportId === id) {
        r.ticket = null;
      }
    });
    changed();
  };

  const dispose = () => {
    disposed = true;
    listeners.clear();
    transports.clear();
    for (const [c, r] of records) {
      remove(c, r);
    }
    motion.dispose();
    probeInput.dispose();
  };

  return {
    action,
    previewMotion: motion.preview,
    list,
    subscribe,
    openTransport,
    closeTransport,
    ticketPending,
    dispose
  };
};
