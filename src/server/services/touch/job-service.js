// Job service for the touch interface: load, start, pause, resume and stop a
// program on a connected Grbl controller, with every state-changing action
// re-checked against a fresh controller report. Start and resume additionally
// require a short-lived confirmation ticket bound to the client's event
// stream, so a stale page or a replayed request cannot move the machine.
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
// Explicit extensions: examples/cncjs-touch/preview-server.cjs loads this
// module with Node's native ES module loader, outside of Babel.
// eslint-disable-next-line import/extensions
import { createPreflight, controllerStatus } from './motion-preflight.js';
// eslint-disable-next-line import/extensions
import { createProbeInput } from './probe-input.js';
// eslint-disable-next-line import/extensions
import { buildResume, modalsBeforeFirstMove, programLines } from './resume.js';

// A status report older than this is not trusted to describe the machine.
const MAX_REPORT_AGE_MS = 2500;

// A start/resume confirmation must be used within this window.
const TICKET_LIFETIME_MS = 15000;

const MAX_FILE_SIZE = 20 * 1048576;

// Grbl settings exposed to the client: report mask/units, max rates, max
// accelerations, travel limits and spindle range. The full list ($$) is only
// sent on request, for the commissioning backup.
const EXPOSED_SETTINGS = [20, 21, 22, 23, 30, 31, 32, 110, 111, 112, 120, 121, 122, 130, 131, 132];

// A running job is reported stalled when Grbl stays idle this long while CNCjs
// still waits for acknowledgements (a lost 'ok' or a line lost on the link).
const STALL_MS = 30000;

// Spin-up dwell when the spindle is started again after a tool change.
const TOOL_CHANGE_SPINUP_S = 3;

// Stop: how long a feed hold may take to bring the axes to rest before the
// soft reset is sent anyway.
const HALT_MS = 5000;

// Grbl sends no status report during a homing cycle: the cycle is taken as
// running from the $H until a report shows Idle or Alarm again (at least this
// long after it, so a report already on its way does not end it), an alarm,
// a board restart, or this limit.
const HOMING_MIN_MS = 1000;
const HOMING_MAX_MS = 180000;

// Z zero with a touch plate: a fast probe down, a 1 mm back-off, a slow probe,
// then the work Z is set so that the plate top reads its thickness, and the
// tool rises 5 mm above it. Everything in absolute coordinates (G90, mm), so
// an alarm in the middle leaves no relative mode behind.
const PLATE = {
  fastFeed: 100,
  slowFeed: 25,
  backOff: 1,
  clearance: 5,
  minSearch: 1,
  maxSearch: 100,
  maxThickness: 50
};

const axisNumber = (v) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const fmt = (n) => String(Math.round(n * 1000) / 1000);

const grblCode = (res) => {
  const n = Number(res && res.message);
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : null;
};

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

// Durations (ticket lifetime, report age) are measured on a monotonic clock:
// the wall clock can be set back by NTP, which would keep a ticket alive.
const monotonic = () => performance.now();

export const createService = (store, config, clock = monotonic) => {
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
        // Last ALARM:n code, kept until the board restarts.
        alarm: null,
        // Since when Grbl is idle while the job waits for acknowledgements.
        stall: null,
        // Spindle state when a tool change (M6) pause began, to restart it on resume.
        toolChange: null,
        // Line (of the original file) acknowledged when the last job was stopped.
        lastStop: null,
        // Plate probe in progress, and the last one (result or failure).
        probing: null,
        zeroZ: null,
        // Homing cycle sent ($H) and not yet over (see HOMING_MIN_MS).
        homing: null,
        // Status reports received, so a step can wait for a newer one.
        reports: 0,
        generation: crypto.randomBytes(12).toString('hex')
      };
      r.status = () => {
        r.seen = clock();
        r.reports += 1;
        if (r.homing && clock() - r.homing.since >= HOMING_MIN_MS &&
            /^(Idle|Alarm)/.test(controllerStatus(c).activeState || '')) {
          r.homing = null;
        }
        const s = c.sender && c.sender.state;
        const waiting = c.workflow && c.workflow.state === 'running' && controllerStatus(c).activeState === 'Idle' &&
          s && Number.isFinite(s.sent) && Number.isFinite(s.received) && s.received < s.sent;
        if (!waiting) {
          r.stall = null;
        } else if (!r.stall || r.stall.received !== s.received) {
          r.stall = { since: r.seen, received: s.received };
        }
        observeToolChange(c, r);
        changed();
      };
      r.alarmed = (res) => {
        r.alarm = grblCode(res);
        r.homing = null;
        changed();
      };
      r.reset = (payload) => {
        r.seen = null;
        r.modalSeen = null;
        r.wcs = null;
        r.ticket = null;
        r.alarm = null;
        r.stall = null;
        r.homing = null;
        r.startups += 1;
        // A restart (E-stop wired to reset, an alarm abort, a reset from another
        // client) during a pause: Grbl is back to G54, G21, G0 and F0.
        if (r.job && r.job.started && c.workflow && c.workflow.state !== 'idle') {
          r.job.boardRestarted = true;
        }
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
      // A line refused by Grbl (error:N) during the job: CNCjs pauses on it,
      // or goes on with ignoreErrors, and ends the job either way when it was
      // the last line. Such a program is never reported finished.
      r.error = (res) => {
        if (r.probing) {
          r.probing.error = grblCode(res);
        }
        if (r.job && r.job.started && !r.job.stopped && c.workflow && c.workflow.state !== 'idle') {
          r.job.errors = (r.job.errors || 0) + 1;
          r.job.lastError = grblCode(res);
          changed();
        }
      };
      c.runner.on('error', r.error);
      c.runner.on('alarm', r.alarmed);
      c.sender.on('load', r.file);
      c.sender.on('unload', r.file);
      c.sender.on('end', r.end);
      // A new run of the loaded program (also started from CNCjs on the PC) starts
      // clean: the end, stop, restart and probe of an earlier run do not apply to it.
      r.run = () => {
        if (r.job) {
          r.job.stopped = false;
          r.job.finishedAt = null;
          r.job.boardRestarted = false;
          r.job.probeFailed = false;
          r.job.errors = 0;
          r.job.lastError = null;
          changed();
        }
      };
      if (c.workflow && typeof c.workflow.on === 'function') {
        c.workflow.on('start', r.run);
      }
      records.set(c, r);
    }
    return records.get(c);
  };

  // CNCjs sets runner and sender to null when it destroys a controller (port
  // closed or gone, e.g. a USB cable pulled): forget the record in any case,
  // otherwise every later snapshot would fail on the same dead controller.
  const modalFresh = (r) => Number.isFinite(r.modalSeen) && clock() >= r.modalSeen && clock() - r.modalSeen <= MAX_REPORT_AGE_MS;
  const modalWcs = (r) => (modalFresh(r) ? r.wcs : null);

  // The spindle state is read when a tool change pause begins, before the
  // operator stops the spindle, so the resume can start it again.
  const observeToolChange = (c, r) => {
    const reason = c.sender && c.sender.state && c.sender.state.holdReason;
    if (!(c.workflow && c.workflow.state === 'paused' && reason && reason.data === 'M6')) {
      r.toolChange = null;
      return;
    }
    if (!r.toolChange) {
      r.toolChange = { restart: null, frozen: false };
    }
    if (r.toolChange.frozen) {
      return;
    }
    // When the pause begins, $G and FS may still describe the state before the
    // program's M3: keep learning from fresh reports until the operator stops
    // the spindle, then keep what was learnt.
    const parser = (c.runner && c.runner.state && c.runner.state.parserstate) || {};
    const mode = modalFresh(r) && parser.modal ? parser.modal.spindle : null;
    const turning = realtimeValue(controllerStatus(c).spindle);
    if (mode === 'M3' || mode === 'M4') {
      const speed = Number(parser.spindle) > 0 ? Number(parser.spindle) : turning;
      if (speed > 0) {
        r.toolChange.restart = { mode, speed };
      }
    } else if (r.toolChange.restart && (mode === 'M5' || turning === 0)) {
      r.toolChange.frozen = true;
    }
  };

  const remove = (c, r) => {
    records.delete(c);
    if (c.runner) {
      c.runner.removeListener('status', r.status);
      c.runner.removeListener('startup', r.reset);
      c.runner.removeListener('parserstate', r.modal);
      c.runner.removeListener('raw', r.raw);
      c.runner.removeListener('error', r.error);
      c.runner.removeListener('alarm', r.alarmed);
    }
    if (c.workflow && typeof c.workflow.removeListener === 'function') {
      c.workflow.removeListener('start', r.run);
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
    if (record(c).probing) {
      throw conflict('Palpage en cours.');
    }
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

  // Why CNCjs holds the program: null for an operator pause (CNCjs appends
  // "%wait" to every program and a pause made then keeps that reason), 'M0',
  // 'M1' or 'M6' when the program asked for it (CNCjs comments M6 out and
  // pauses), 'error' when a line was refused by Grbl.
  const pauseKind = (c) => {
    const reason = c.sender && c.sender.state && c.sender.state.holdReason;
    if (!reason || reason.data === '%wait') {
      return null;
    }
    if (reason.err) {
      return 'error';
    }
    return ['M0', 'M1', 'M6'].includes(reason.data) ? reason.data : 'other';
  };

  // Grbl reports the spindle speed in FS:; it is 0 once M5 is executed. A
  // firmware without FS (no variable spindle, Grbl 0.9) is judged on the
  // spindle state of a fresh $G, which CNCjs asks for about twice a second at rest.
  const spindleStill = (c) => {
    const speed = realtimeValue(controllerStatus(c).spindle);
    if (speed !== null && speed > 0) {
      throw conflict('La broche tourne encore (' + speed + ' tr/min) : arrêtez-la d’abord (M5).');
    }
    if (speed === null && modalFresh(record(c))) {
      const parser = (c.runner && c.runner.state && c.runner.state.parserstate) || {};
      const spindle = parser.modal && parser.modal.spindle;
      if (spindle === 'M3' || spindle === 'M4') {
        throw conflict('La broche est commandée (' + spindle + ') : arrêtez-la d’abord (M5).');
      }
    }
  };

  const spindleOn = (c) => {
    try {
      spindleStill(c);
      return false;
    } catch (_) {
      return true;
    }
  };

  const homingActive = (r) => !!r.homing && clock() - r.homing.since < HOMING_MAX_MS;

  // CNCjs's forced stop decides from its own copy of the state, refreshed every
  // 250 ms: it sends a feed hold only if that copy says Run and a reset only if
  // it says Hold, so lines already buffered in Grbl kept running when Grbl was
  // Idle at that moment (a G4 dwell, the first instants of a start, a tool
  // change with the spindle on). The decision is taken here from the latest
  // report, before CNCjs rewinds its sender. Moving axes, or buffered lines that
  // may start moving any moment (the report can be 250 ms old), get a feed hold
  // first (in Idle Grbl turns Hold:0 at once and starts no new block), then a
  // reset once a report newer than the request shows them at rest, or after
  // HALT_MS: a reset in motion would raise ALARM:3 and lose the position. A hold
  // or a spindle left on with nothing buffered is reset at once.
  const haltPlan = (c) => {
    const s = controllerStatus(c);
    const state = s.activeState || '';
    const sender = (c.sender && c.sender.state) || {};
    const feeder = c.feeder.toJSON();
    if (state === 'Run') {
      return 'hold';
    }
    if (state === 'Hold' && Number(s.subState) === 1) {
      return 'settle';
    }
    if (state === 'Hold') {
      return 'reset';
    }
    if (Number(sender.sent) > Number(sender.received) || feeder.queue || feeder.pending) {
      return 'hold';
    }
    return spindleOn(c) ? 'reset' : '';
  };
  const halt = (c, plan) => {
    if (plan === 'reset') {
      c.command('reset');
      return;
    }
    if (plan !== 'hold' && plan !== 'settle') {
      return;
    }
    if (plan === 'hold') {
      c.command('feedhold');
    }
    const deadline = clock() + HALT_MS;
    const mark = record(c).reports;
    const wait = () => {
      if (controllers()[c.options.port] !== c || c.isClose() || !c.runner) {
        return;
      }
      if (record(c).reports <= mark && clock() <= deadline) {
        setTimeout(wait, 50);
        return;
      }
      const s = controllerStatus(c);
      const state = s.activeState || '';
      if (/^(Alarm|Door)/.test(state)) {
        return;
      }
      if ((state === 'Hold' && Number(s.subState) !== 1) || state === 'Idle' || clock() > deadline) {
        c.command('reset');
        return;
      }
      setTimeout(wait, 50);
    };
    setTimeout(wait, 50);
  };

  const readyFor = (c, action, revision) => {
    const j = validJob(c, revision);
    available(c);
    if (record(c).probing) {
      throw conflict('Palpage en cours.');
    }
    if (action === 'start') {
      idle(c);
      spindleStill(c);
      if (record(c).loading) {
        throw conflict('Chargement en cours.');
      }
      if (j.started || !c.sender.state.total) {
        throw conflict('Rechargez le fichier avant un nouveau démarrage.');
      }
      // A program that does not set its units or distance mode runs in Grbl's
      // current ones, while its preview assumes millimetres and absolute.
      if (j.sets && (!j.sets.units || !j.sets.distance)) {
        if (!modalFresh(record(c))) {
          throw conflict('Le programme ne fixe pas ses unités ou son mode (G21/G90) : attendre un état modal ($G) récent.');
        }
        const modal = ((c.runner.state && c.runner.state.parserstate) || {}).modal || {};
        if (!j.sets.units && modal.units !== 'G21') {
          throw conflict('Le programme ne fixe pas ses unités et la machine est en ' + (modal.units || 'unités inconnues') + ' : ajoutez G21 au début du programme ou remettez la machine en G21.');
        }
        if (!j.sets.distance && modal.distance !== 'G90') {
          throw conflict('Le programme ne fixe pas son mode et la machine est en ' + (modal.distance || 'mode inconnu') + ' : ajoutez G90 au début du programme ou remettez la machine en G90.');
        }
      }
    } else {
      const kind = pauseKind(c);
      const state = controllerStatus(c).activeState;
      if (!j.started || c.workflow.state !== 'paused') {
        throw conflict('La reprise exige une pause simple confirmée par la machine.');
      }
      if (kind === 'error') {
        throw conflict('Pause sur une erreur Grbl : arrêtez le travail, corrigez la cause, puis reprenez à une ligne.');
      }
      if (j.boardRestarted) {
        throw conflict('La carte a redémarré pendant le travail (arrêt d’urgence, alarme ou réinitialisation) : elle a perdu repère, unités et avance. Arrêtez le travail, puis reprenez à une ligne.');
      }
      if (j.probeFailed) {
        throw conflict('Palpage échoué pendant la pause : l’état modal du programme est perdu. Arrêtez le travail, puis reprenez à une ligne.');
      }
      if (kind === 'M0' || kind === 'M1' || kind === 'M6') {
        if (state !== 'Idle' && state !== 'Hold') {
          throw conflict('Attendez l’arrêt de la machine (Idle ou Hold) avant de reprendre.');
        }
        const feeder = c.feeder.toJSON();
        if (feeder.queue || feeder.pending) {
          throw conflict('Des commandes sont en attente : attendez avant de reprendre.');
        }
      } else if (kind === 'other' || state !== 'Hold') {
        throw conflict('La reprise exige une pause simple confirmée par la machine.');
      }
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
    if (record(c).probing) {
      throw conflict('Palpage en cours.');
    }
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
    // At rest, or during a pause the program asked for once the machine has stopped (tool change).
    const programStop = c.workflow.state === 'paused' && ['M0', 'M1', 'M6'].includes(pauseKind(c)) &&
      controllerStatus(c).activeState === 'Idle';
    if (c.workflow.state !== 'idle' && !programStop) {
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

  // The plate probe runs at rest, or during a pause the program asked for
  // (tool change) once the machine has stopped, with the probe free, the
  // spindle still and the modal state known: G90 and G21.
  const zeroZReady = (c) => {
    available(c);
    const r = record(c);
    if (r.probing) {
      throw conflict('Palpage en cours.');
    }
    if (r.loading) {
      throw conflict('Chargement en cours.');
    }
    const programPause = c.workflow.state === 'paused' && ['M0', 'M1', 'M6'].includes(pauseKind(c));
    if (c.workflow.state !== 'idle' && !programPause) {
      throw conflict('Le zéro Z avec plaque se règle au repos ou pendant une pause du programme (M0, M1, M6).');
    }
    const status = controllerStatus(c);
    if (status.activeState !== 'Idle') {
      throw conflict('La machine doit être au repos (Idle).');
    }
    const feeder = c.feeder.toJSON();
    if (feeder.queue || feeder.pending) {
      throw conflict('Des commandes sont en attente.');
    }
    spindleStill(c);
    if (!modalFresh(r)) {
      throw conflict('État modal ($G) trop ancien : attendre un rapport récent.');
    }
    const modal = ((c.runner.state && c.runner.state.parserstate) || {}).modal || {};
    if (modal.distance !== 'G90') {
      throw conflict('Mode relatif (G91) actif : le zéro Z avec plaque exige G90.');
    }
    if (modal.units !== 'G21') {
      throw conflict('Unités en pouces (G20) : le zéro Z avec plaque exige G21.');
    }
    // The positions read back are in the report units: $13=1 reports inches
    // whatever G21 says, and they would be sent back as millimetres.
    if (settingNumber(allSettings(c), 13) !== 0) {
      throw conflict('Rapports en pouces ($13=1) ou réglage $13 inconnu : le zéro Z avec plaque exige $13=0.');
    }
    // During a program pause, the probe ends in G0 with F25: the program's own
    // motion mode and feed are sent back at the end, which Grbl accepts without
    // axis words for G0 and G1 only.
    if (programPause && modal.motion !== 'G0' && !(modal.motion === 'G1' && Number(((c.runner.state && c.runner.state.parserstate) || {}).feedrate) > 0)) {
      throw conflict('Mode de déplacement ' + (modal.motion || 'inconnu') + ' actif : pendant une pause, le zéro Z avec plaque exige G0 ou G1 avec une avance.');
    }
    if (!r.wcs) {
      throw conflict('Repère de travail inconnu : attendre un rapport $G.');
    }
    if (axisNumber(status.wpos && status.wpos.z) === null) {
      throw conflict('Position Z inconnue.');
    }
    const probe = probeInput.inspect(c.options.port);
    if (!probe.fresh) {
      throw conflict('Entrée sonde : rapport trop ancien.');
    }
    if (probe.state === 'contact') {
      throw conflict('La sonde est déjà en contact : dégagez-la avant de palper.');
    }
    if (probe.code !== 'EXPLICIT' && probe.code !== 'MISSING') {
      throw conflict('Entrée sonde illisible dans le rapport Grbl.');
    }
    if (hasAutomations(config)) {
      throw conflict('Des automatismes CNCjs sont configurés. Leur compatibilité doit être vérifiée avant utilisation.');
    }
  };

  const plateParams = (body) => {
    const thickness = Number(body.thickness);
    const search = Number(body.search);
    if (!Number.isFinite(thickness) || thickness <= 0 || thickness > PLATE.maxThickness) {
      throw conflict('Épaisseur de plaque invalide (plus de 0 et au plus ' + PLATE.maxThickness + ' mm).');
    }
    if (!Number.isFinite(search) || search < PLATE.minSearch || search > PLATE.maxSearch) {
      throw conflict('Distance de recherche invalide (' + PLATE.minSearch + ' à ' + PLATE.maxSearch + ' mm).');
    }
    return { thickness: Math.round(thickness * 1000) / 1000, search: Math.round(search * 1000) / 1000 };
  };

  // Grbl's answers to lines the touch service sends through CNCjs's feeder:
  // the feeder clears `pending` as soon as it sends its last line, before
  // Grbl answers, so only the `ok` tells that a line was executed (G38.2 and
  // G4 answer once done). The `ok` that follows a $G reply belongs to CNCjs's
  // own parser state query, sent every 500 ms, paused or not.
  const answers = (c, r) => {
    const runner = c.runner;
    const t = { oks: 0, error: null, reportsAtOk: 0 };
    // A $G reply already parsed whose ok is still on its way (CNCjs's own flag).
    let parserReply = !!(c.actionMask && c.actionMask.queryParserState && c.actionMask.queryParserState.reply);
    const onParser = () => {
      parserReply = true;
    };
    const onOk = () => {
      if (parserReply) {
        parserReply = false;
        return;
      }
      t.oks += 1;
      t.reportsAtOk = r.reports;
    };
    const onError = (res) => {
      parserReply = false;
      t.error = grblCode(res) || -1;
    };
    runner.on('parserstate', onParser);
    runner.on('ok', onOk);
    runner.on('error', onError);
    t.done = () => {
      runner.removeListener('parserstate', onParser);
      runner.removeListener('ok', onOk);
      runner.removeListener('error', onError);
    };
    return t;
  };

  // Resolves once the line sent is acknowledged and two reports received after
  // its `ok` show the machine idle (a move answers `ok` when it is planned;
  // the second report is at least one polling period later); rejects on an
  // alarm, a Grbl error, a lost controller or the time limit.
  const quiet = (c, r, t, limitMs) => new Promise((resolve, reject) => {
    const deadline = clock() + limitMs;
    const check = () => {
      if (controllers()[c.options.port] !== c || c.isClose() || !c.runner || !c.feeder) {
        reject(conflict('Connexion machine perdue pendant le palpage.'));
        return;
      }
      const state = controllerStatus(c).activeState || '';
      if (/^Alarm/.test(state)) {
        reject(conflict('Alarme pendant le palpage (' + (r.alarm ? 'ALARM:' + r.alarm : 'code non reçu') + ') : arrêtez le travail, déverrouillez ($X) et vérifiez la sonde.'));
        return;
      }
      if (r.probing && r.probing.error) {
        reject(conflict('Grbl a refusé une ligne du palpage (error:' + r.probing.error + ').'));
        return;
      }
      if (r.probing && r.probing.cancelled) {
        reject(conflict('Palpage interrompu par l’opérateur.'));
        return;
      }
      if (t.error) {
        reject(conflict('Grbl a refusé une ligne du palpage (error:' + t.error + ').'));
        return;
      }
      if (t.oks >= 1 && state === 'Idle' && r.reports >= t.reportsAtOk + 2) {
        resolve();
        return;
      }
      if (clock() > deadline) {
        reject(conflict('Palpage sans réponse à temps : arrêtez et vérifiez la machine.'));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });

  const zeroZ = (c, t) => {
    zeroZReady(c);
    const r = record(c);
    const p = t.params;
    const zOf = () => axisNumber(controllerStatus(c).wpos && controllerStatus(c).wpos.z);
    const send = (line, limitMs) => {
      const t = answers(c, r);
      c.command('gcode', line);
      return quiet(c, r, t, limitMs).then(() => t.done(), (err) => {
        t.done();
        throw err;
      });
    };
    r.probing = { contact: null, error: null };
    changed();
    const z0 = zOf();
    // What the paused program expects back (see zeroZReady).
    const parser = (c.runner.state && c.runner.state.parserstate) || {};
    const inPause = c.workflow.state === 'paused';
    const feed = Number(parser.feedrate);
    const restore = inPause ? parser.modal.motion + (feed > 0 ? ' F' + fmt(feed) : '') : null;
    return send('G38.2 Z' + fmt(z0 - p.search) + ' F' + PLATE.fastFeed, 60000 * p.search / PLATE.fastFeed + 15000)
      .then(() => {
        const cz = zOf();
        if (cz === null || cz > z0 - 0.01 || cz <= z0 - p.search + 0.001) {
          throw conflict('Palpage sans contact net (Z ' + cz + ' depuis ' + z0 + ').');
        }
        r.probing.contact = cz;
        return send('G0 Z' + fmt(cz + PLATE.backOff), 15000);
      })
      .then(() => send('G38.2 Z' + fmt(r.probing.contact - PLATE.backOff) + ' F' + PLATE.slowFeed, 30000))
      .then(() => {
        const status = controllerStatus(c);
        r.probing.contact = zOf();
        r.probing.machineZ = axisNumber(status.mpos && status.mpos.z);
        return send('G10 L20 P0 Z' + fmt(p.thickness), 15000);
      })
      .then(() => {
        const now = zOf();
        if (now === null || Math.abs(now - p.thickness) > 0.05) {
          throw conflict('Le repère n’a pas pris la valeur attendue (Z ' + now + ' au lieu de ' + p.thickness + ').');
        }
        return send('G0 Z' + fmt(p.thickness + PLATE.clearance), 15000);
      })
      .then(() => (restore ? send(restore, 15000) : null))
      .then(() => {
        r.zeroZ = { at: Date.now(), thickness: p.thickness, machineZ: r.probing.machineZ, wcs: r.wcs };
        r.probing = null;
        changed();
        return { message: 'Zéro Z réglé avec la plaque de ' + p.thickness + ' mm (contact à Z machine ' + fmt(r.zeroZ.machineZ) + ', repère ' + r.zeroZ.wcs + '). Outil dégagé à Z ' + fmt(p.thickness + PLATE.clearance) + '.' };
      })
      .catch((err) => {
        r.zeroZ = { at: Date.now(), failed: err.message };
        // The modal state the paused program relies on is no longer known.
        if (inPause && r.job) {
          r.job.probeFailed = true;
        }
        r.probing = null;
        changed();
        throw err;
      });
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
        record(c).homing = { since: clock() };
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
    },
    zeroZ: {
      guard: zeroZReady,
      params: plateParams,
      name: (c, params) => 'Zéro Z avec plaque de ' + params.thickness + ' mm (recherche ' + params.search + ' mm)',
      run: zeroZ
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

  const programPauseOf = (c, r) => {
    const kind = c.workflow.state === 'paused' ? pauseKind(c) : null;
    if (!kind) {
      return null;
    }
    const reason = c.sender.state.holdReason || {};
    const message = typeof reason.msg === 'string' ? reason.msg.slice(0, 120) : '';
    const tool = /(?:^|[^A-Z])T\s*(\d{1,3})/i.exec(message);
    return {
      kind,
      message,
      tool: tool ? Number(tool[1]) : null,
      restartSpindle: kind === 'M6' && r.toolChange ? r.toolChange.restart : null
    };
  };

  const snapshot = (c) => {
    const r = record(c);
    const sender = c.sender.toJSON();
    const feederState = c.feeder.toJSON();
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
    const zeroZReason = reason(() => zeroZReady(c));

    const jobErrors = (r.job && r.job.errors) || 0;
    const ended = Boolean(r.job && r.job.finishedAt && !r.job.stopped && c.workflow.state === 'idle');

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
      // Every line acknowledged and the program over (not stopped by the operator),
      // without any line refused by Grbl.
      finished: ended && !jobErrors,
      // Stopped by the operator (Grbl may have acknowledged every line before running them).
      jobStopped: !!(r.job && r.job.stopped),
      finishedWithErrors: ended && jobErrors > 0,
      jobErrors,
      jobLastError: (r.job && r.job.lastError) || null,
      // ALARM:n while the controller is in alarm (null: no code received, e.g. homing lock).
      alarmCode: /^Alarm/.test(state.activeState || '') ? r.alarm : null,
      stalledMs: r.stall && Number.isFinite(r.seen) && r.seen - r.stall.since >= STALL_MS ? r.seen - r.stall.since : null,
      programPause: programPauseOf(c, r),
      resume: r.job && r.job.resume ? { ...r.job.resume } : null,
      stoppedAtLine: r.lastStop ? r.lastStop.line : null,
      stoppedFile: r.lastStop ? r.lastStop.file : null,
      canPause: c.workflow.state === 'running',
      // A macro waiting in a dwell (CNCjs queue not empty) can be stopped too.
      canStop: c.workflow.state !== 'idle' || ['Run', 'Hold', 'Home', 'Jog'].includes(state.activeState) || /^Door/.test(state.activeState || '') ||
        !!r.probing || homingActive(r) || !!(feederState.queue || feederState.pending),
      homing: homingActive(r),
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
      canSpindleStop: !spindleStopReason,
      // Z zero with a touch plate (guarded like the commissioning commands).
      canZeroZ: !zeroZReason,
      zeroZReason,
      probing: !!r.probing,
      zeroZ: r.zeroZ ? { ...r.zeroZ } : null
    };
  };

  // Reads a program from the watch directory and hands it to the controller.
  // The file must sit directly in the watch directory and must not change
  // while it is read.
  const validName = (file) => {
    if (typeof file !== 'string' || file !== path.basename(file) ||
        /[\\/\0]/.test(file) || !/\.(nc|gcode|ngc|tap|cnc|txt)$/i.test(file)) {
      throw conflict('Nom de fichier invalide.');
    }
  };

  const readProgram = async (name) => {
    const root = await fs.realpath(config.get('watchDirectory'));
    const file = await fs.realpath(path.join(root, name));
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
    return gcode;
  };

  // What a resume from a line would send, without loading anything.
  const resumePlan = async (c, body) => {
    available(c);
    validName(body.file);
    const gcode = await readProgram(body.file);
    const plan = buildResume(gcode, Number(body.line), { name: body.file.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/, '') });
    const summary = { ...plan };
    delete summary.program;
    return summary;
  };

  const load = async (c, r, body) => {
    idle(c);
    if (r.loading) {
      throw conflict('Un chargement est déjà en cours.');
    }
    validName(body.file);

    r.loading = true;
    r.ticket = null;
    try {
      const gcode = await readProgram(body.file);

      // Recheck after asynchronous disk access, before replacing the loaded job.
      idle(c);
      if (hasAutomations(config)) {
        throw conflict('Automatismes CNCjs à vérifier avant chargement.');
      }

      const originalName = body.file.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/, '');
      let program = gcode;
      let resume = null;
      if (body.fromLine !== undefined && body.fromLine !== null) {
        const plan = buildResume(gcode, Number(body.fromLine), { name: originalName });
        program = plan.program;
        resume = {
          from: plan.from,
total: plan.total,
line: plan.line,
tool: plan.tool,
toolChanged: plan.toolChanged,
          spindle: plan.spindle,
coolant: plan.coolant,
preambleLength: plan.preamble.length
        };
      }
      const revision = crypto.randomBytes(20).toString('hex');
      await new Promise((resolve, reject) => {
        c.command('gcode:load', body.file, program, { touchJob: revision }, (err) => {
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
        originalName,
        started: false,
        // G54-G59.x select, G10 L2/L20 and G92 change the work offset.
        changesOffset: changesOffset(resume ? programLines(gcode).slice(resume.from - 1).join('\n') : gcode),
        sets: modalsBeforeFirstMove(program),
        wcsAtStart: null,
        resume
      };
      return { message: resume ? 'Reprise à la ligne ' + resume.from + ' chargée dans CNCjs. Aucun démarrage envoyé.' : 'Fichier chargé dans CNCjs. Aucun démarrage envoyé.' };
    } finally {
      r.loading = false;
      changed();
    }
  };

  // After a tool change the spindle was stopped by the operator: start it at
  // the programmed speed and wait for the spin-up dwell to be acknowledged
  // (CNCjs resets its command queue on resume) before resuming the program.
  // Both lines must be answered: resuming during the dwell made CNCjs take
  // the G4's `ok` for a program line, one line off in its count of Grbl's
  // receive buffer for the rest of the job.
  const SPINUP_MS_MAX = 20000;
  const restartSpindleThenResume = (c, restart) => new Promise((resolve, reject) => {
    const r = record(c);
    const t = answers(c, r);
    const fail = (message) => {
      t.done();
      reject(conflict(message));
    };
    c.command('gcode', [restart.mode + ' S' + restart.speed, 'G4 P' + TOOL_CHANGE_SPINUP_S]);
    const deadline = clock() + SPINUP_MS_MAX;
    const check = () => {
      // The controller may be gone (port closed): never touch a destroyed one.
      if (controllers()[c.options.port] !== c || c.isClose() || !c.feeder || !c.workflow || c.workflow.state !== 'paused') {
        fail('Broche non relancée : la machine a changé d’état. Reprise annulée, vérifiez la machine.');
        return;
      }
      if (t.error) {
        fail('Grbl a refusé la relance de la broche (error:' + t.error + ') : reprise annulée.');
        return;
      }
      const feeder = c.feeder.toJSON();
      if (t.oks >= 2 && !feeder.queue && !feeder.pending) {
        t.done();
        c.command('gcode:resume');
        resolve({ message: 'Broche relancée (' + restart.mode + ' S' + restart.speed + '), reprise demandée.' });
        return;
      }
      if (clock() > deadline) {
        fail('Broche non relancée à temps : reprise annulée. Vérifiez la machine.');
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });

  const perform = (body) => {
    if (!body || typeof body.port !== 'string') {
      throw conflict('Choisissez une machine.');
    }
    const c = get(body.port);
    const r = record(c);
    const a = body.action;

    if (['prepare', 'start', 'resume', 'macro', 'override', 'unlock', 'home', 'spindle', 'zeroZ', 'readSettings'].includes(a)) {
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

    if (a === 'resumePlan') {
      return resumePlan(c, body);
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
      if (!['start', 'resume', 'macro', 'unlock', 'home', 'spindle', 'zeroZ'].includes(body.operation)) {
        throw conflict('Action invalide.');
      }
      const nonce = crypto.randomBytes(24).toString('hex');
      let name;
      if (COMMISSIONING[body.operation]) {
        const op = COMMISSIONING[body.operation];
        const params = op.params ? op.params(body) : undefined;
        op.guard(c);
        name = op.name(c, params);
        r.ticket = {
          nonce,
          operation: body.operation,
          params,
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
      const restart = a === 'resume' && pauseKind(c) === 'M6' && r.toolChange && r.toolChange.restart;
      if (restart) {
        return restartSpindleThenResume(c, restart);
      }
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
      // (Grbl then asks for a new homing or $X). Grbl reports nothing during
      // the cycle, so the $H sent is enough to know it runs.
      if (c.workflow.state === 'idle' && (activeState === 'Home' || homingActive(r))) {
        r.ticket = null;
        r.homing = null;
        c.command('reset');
        return { message: 'Prise d’origine interrompue (réinitialisation). La carte demandera $H ou $X.' };
      }
      // Door open: CNCjs's stop sends neither feed hold nor reset in that
      // state, so Grbl would keep its planned moves for the next cycle start.
      const door = /^Door/.test(activeState || '');
      if (c.workflow.state === 'idle' && door) {
        r.ticket = null;
        c.command('reset');
        return { message: 'Arrêt avec porte ouverte (réinitialisation). La carte peut demander $H ou $X.' };
      }
      // The line reached, kept for a resume from a line, and the job marked
      // stopped (also when the stop interrupts a probe during a pause).
      const markStopped = () => {
        if (c.workflow.state !== 'idle' && r.job) {
          const k = Number(c.sender.state.received) || 0;
          const res = r.job.resume;
          let line = k;
          if (res) {
            // Preamble lines are not lines of the file.
            line = k <= res.preambleLength ? res.from - 1 : res.from + (k - res.preambleLength - 1);
          }
          r.lastStop = { file: r.job.name, line };
          r.job.started = true;
          r.job.stopped = true;
          r.job.finishedAt = null;
        }
      };
      // A plate probe in progress: feed hold then reset, and the sequence gives
      // up at its next step.
      if (r.probing) {
        r.ticket = null;
        r.probing.cancelled = true;
        markStopped();
        const plan = haltPlan(c);
        c.command('feeder:stop');
        c.command('gcode:stop');
        halt(c, plan);
        return { message: 'Palpage interrompu. Vérifiez l’immobilisation ; le zéro Z n’est pas réglé.' };
      }
      const feeder = c.feeder.toJSON();
      if (c.workflow.state === 'idle' && !['Run', 'Hold'].includes(activeState) && !feeder.queue && !feeder.pending) {
        throw conflict('Aucun travail à arrêter.');
      }
      r.ticket = null;
      const plan = door ? '' : haltPlan(c);
      if (c.workflow.state === 'idle') {
        // A macro or console commands (CNCjs feeder) move the machine: its
        // queue must be emptied too, or the next 'ok' would send the rest.
        c.command('feeder:stop');
      }
      markStopped();
      c.command('gcode:stop');
      if (door) {
        c.command('reset');
      } else {
        halt(c, plan);
      }
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

  // Cheap key of everything a snapshot depends on, apart from elapsed time
  // (report ages, ticket expiry), which the stream heartbeat covers. GrblRunner
  // replaces its state and settings objects only when they change, so their
  // identity tells a repeated status report from a new one without building
  // the snapshot.
  const ids = new WeakMap();
  let nextId = 0;
  const idOf = (o) => {
    if (!o || typeof o !== 'object') {
      return o === undefined ? '' : String(o);
    }
    if (!ids.has(o)) {
      nextId += 1;
      ids.set(o, nextId);
    }
    return ids.get(o);
  };
  const fingerprint = () => {
    if (disposed) {
      return '';
    }
    const registry = controllers();
    return Object.keys(registry).map((port) => {
      const c = registry[port];
      if (!c) {
        return port;
      }
      const runner = c.runner || {};
      const state = runner.state || {};
      const s = (c.sender && c.sender.state) || {};
      const feeder = c.feeder && typeof c.feeder.toJSON === 'function' ? c.feeder.toJSON() : {};
      const r = records.get(c);
      const j = r && r.job;
      return [
        port, idOf(c), c.type, c.isClose(), c.ready, c.workflow && c.workflow.state,
        idOf(state), idOf(state.status), idOf(state.parserstate), idOf(runner.settings), idOf(c.settings),
        s.name, s.total, s.sent, s.received, s.hold, idOf(s.holdReason), idOf(s.context),
        feeder.queue, feeder.pending,
        r ? [r.loading, r.seen === null, r.modalSeen === null, r.wcs, r.ticket && r.ticket.nonce, r.firmware, r.startups, r.alarm, r.stall && r.stall.since,
          idOf(r.toolChange), r.lastStop && r.lastStop.line, idOf(r.probing), idOf(r.zeroZ), r.homing && r.homing.since].join(',') : '',
        j ? [idOf(j), j.started, j.stopped, j.finishedAt, j.errors].join(',') : ''
      ].join(';');
    }).join('|');
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
    fingerprint,
    subscribe,
    openTransport,
    closeTransport,
    ticketPending,
    dispose
  };
};
