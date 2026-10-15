'use strict';
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { createPreflight, controllerStatus } = require('./motion-preflight');
const { createProbeInput } = require('./probe-input');

function createService(store, config, clock = Date.now) {
  const records = new Map(), listeners = new Set(), transports = new Set();
  let disposed = false;
  function changed() { listeners.forEach(fn => fn()); }
  const probeInput = createProbeInput(store, clock);
  const motion = createPreflight(store, config, c => {
    const r = record(c);
    return { loading: r.loading, confirmationPending: !!r.ticket && clock() <= r.ticket.expires };
  }, clock);
  function fail(message) { const e = new Error(message); e.status = 409; throw e; }
  function record(c) {
    if (!records.has(c)) {
      const r = { seen: null, job: null, loading: false, ticket: null, generation: crypto.randomBytes(12).toString('hex') };
      records.set(c, r);
      r.status = () => { r.seen = clock(); changed(); };
      r.reset = () => { r.seen = null; r.ticket = null; changed(); };
      r.file = () => { r.job = null; r.ticket = null; changed(); };
      c.runner.on('status', r.status); c.runner.on('startup', r.reset);
      c.sender.on('load', r.file); c.sender.on('unload', r.file);
    }
    return records.get(c);
  }
  function controllers() { return store.get('controllers') || {}; }
  function remove(c, r) {
    c.runner.removeListener('status', r.status); c.runner.removeListener('startup', r.reset);
    c.sender.removeListener('load', r.file); c.sender.removeListener('unload', r.file);
    records.delete(c);
  }
  function get(port) {
    if (disposed) fail('Service indisponible.');
    const registry = controllers(), c = Object.prototype.hasOwnProperty.call(registry, port) && registry[port];
    if (!c || c.isClose() || c.type !== 'Grbl') fail('Contrôleur Grbl non connecté.');
    return c;
  }
  function available(c) {
    const r = record(c);
    if (controllers()[c.options.port] !== c || c.isClose() || !c.ready) fail('Connexion machine indisponible.');
    if (!Number.isFinite(r.seen) || clock() < r.seen || clock() - r.seen > 2500) fail('État machine trop ancien : attendre un rapport récent.');
  }
  function idle(c) {
    available(c);
    const feeder = c.feeder.toJSON();
    if (c.workflow.state !== 'idle' || controllerStatus(c).activeState !== 'Idle' || feeder.queue || feeder.pending) fail('La machine doit être au repos (Idle), sans commande en attente.');
  }
  function validJob(c, revision) {
    const r = record(c), j = r.job;
    if (!j || j.revision !== revision || c.sender.state.context.touchJob !== j.revision || c.sender.state.name !== j.name) fail('Le fichier chargé a changé. Rechargez-le et confirmez à nouveau.');
    return j;
  }
  function readyFor(c, action, revision) {
    const j = validJob(c, revision);
    available(c);
    if (action === 'start') {
      idle(c);
      if (j.started || !c.sender.state.total) fail('Rechargez le fichier avant un nouveau démarrage.');
    } else {
      if (!j.started || c.workflow.state !== 'paused' || controllerStatus(c).activeState !== 'Hold' || c.sender.state.holdReason) fail('La reprise exige une pause simple confirmée par la machine.');
    }
    if ((config.get('events') || []).some(e => e.enabled !== false)) fail('Des automatismes CNCjs sont configurés. Leur compatibilité doit être vérifiée avant utilisation.');
    return j;
  }
  function snapshot(c) {
    const r = record(c), sender = c.sender.toJSON(), state = controllerStatus(c);
    const motionState = motion.inspect(c.options.port);
    let loadReason = '', startReason = '', resumeReason = '';
    try { idle(c); if (r.loading) fail('Chargement en cours.'); } catch(e) { loadReason = e.message; }
    try { readyFor(c, 'start', r.job && r.job.revision); } catch(e) { startReason = e.message; }
    try { readyFor(c, 'resume', r.job && r.job.revision); } catch(e) { resumeReason = e.message; }
    const age = Number.isFinite(r.seen) && clock() >= r.seen ? clock() - r.seen : null;
    const settings = {}, source = c.settings && c.settings.settings || {};
    [20,21,22,110,111,112,120,121,122,130,131,132].forEach(n => {
      const v = source['$' + n];
      if (typeof v === 'number' && Number.isFinite(v) || typeof v === 'string' && v.length < 32) settings['$' + n] = v;
    });
    const coordinates = {};
    ['wpos','mpos'].forEach(kind => {
      coordinates[kind] = {};
      ['x','y','z'].forEach(axis => {
        const v = state[kind] && state[kind][axis];
        if (typeof v === 'number' && Number.isFinite(v) || typeof v === 'string' && v.length < 32 && Number.isFinite(Number(v))) coordinates[kind][axis] = v;
      });
    });
    return { port: c.options.port, controllerId: c.options.port, generation: r.generation,
      type: c.type, activeState: state.activeState || '', workflow: c.workflow.state,
      statusAgeMs: age, statusObservedAt: r.seen, coordinates, settings,
      fresh: age !== null && age <= 2500, name: sender.name || '', revision: r.job && r.job.revision,
      originalName: r.job && r.job.originalName, total: sender.total, sent: sender.sent, received: sender.received,
      probeInput: probeInput.inspect(c.options.port),
      loading: r.loading, canPreviewMotion: motionState.available, motionReason: motionState.reason,
      canLoad: !loadReason, loadReason, canStart: !startReason, startReason,
      canResume: !resumeReason, resumeReason, canPause: c.workflow.state === 'running',
      canStop: c.workflow.state !== 'idle' || ['Run','Hold'].includes(state.activeState) };
  }
  async function action(body) {
    if (!body || typeof body.port !== 'string') fail('Choisissez une machine.');
    const c = get(body.port), r = record(c), a = body.action;
    if (['prepare','start','resume'].includes(a)) {
      if (typeof body.generation !== 'string' || body.generation !== r.generation) fail('Le contrôleur a changé ou son identité manque. Choisissez-le à nouveau.');
      if (typeof body.transportId !== 'string' || !transports.has(body.transportId)) fail('Connexion de suivi interrompue. Confirmez à nouveau.');
    }
    if (body.generation !== undefined && body.generation !== r.generation) fail('Le contrôleur a changé. Choisissez-le à nouveau.');
    if (body.transportId !== undefined && !transports.has(body.transportId) && !['pause','stop'].includes(a)) fail('Connexion de suivi interrompue. Confirmez à nouveau.');
    if (a === 'load') {
      idle(c);
      if (r.loading) fail('Un chargement est déjà en cours.');
      if (typeof body.file !== 'string' || body.file !== path.basename(body.file) || /[\\/\0]/.test(body.file) || !/\.(nc|gcode|ngc|tap|cnc|txt)$/i.test(body.file)) fail('Nom de fichier invalide.');
      r.loading = true; r.ticket = null;
      try {
        const root = await fs.realpath(config.get('watchDirectory'));
        const file = await fs.realpath(path.join(root, body.file));
        if (path.dirname(file) !== root) fail('Fichier hors de la bibliothèque.');
        const before = await fs.stat(file);
        if (!before.isFile() || before.size === 0 || before.size > 20 * 1048576) fail('Fichier vide ou supérieur à 20 Mo.');
        const buffer = await fs.readFile(file), after = await fs.stat(file);
        if (before.mtimeMs !== after.mtimeMs || before.ino !== after.ino || buffer.length !== before.size || buffer.includes(0)) fail('Fichier modifié pendant la lecture ou format invalide.');
        const gcode = buffer.toString('utf8');
        // CNCjs % directives execute expressions; this library accepts plain G-code only.
        if (/^[ \t]*%[ \t]*[^\r\n \t]/m.test(gcode)) fail('Les directives CNCjs % ne sont pas acceptées par cette bibliothèque.');
        idle(c); // Recheck after asynchronous disk access, before replacing the loaded job.
        if ((config.get('events') || []).some(e => e.enabled !== false)) fail('Automatismes CNCjs à vérifier avant chargement.');
        const revision = crypto.randomBytes(20).toString('hex');
        await new Promise((resolve,reject) => c.command('gcode:load', body.file, gcode, {touchJob:revision}, err => err ? reject(err) : resolve()));
        r.job = { revision, name:body.file, originalName:body.file.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/,''), started:false };
        return { message:'Fichier chargé dans CNCjs. Aucun démarrage envoyé.' };
      } finally { r.loading = false; changed(); }
    }
    if (a === 'prepare') {
      if (!['start','resume'].includes(body.operation)) fail('Action invalide.');
      const j = readyFor(c,body.operation,body.revision);
      const nonce = crypto.randomBytes(24).toString('hex');
      r.ticket = {nonce, revision:j.revision, operation:body.operation, expires:clock()+15000, transportId:body.transportId};
      return {nonce, name:j.originalName, operation:body.operation, expiresIn:15, generation:r.generation};
    }
    if (a === 'start' || a === 'resume') {
      const t = r.ticket; r.ticket = null;
      if (!t || t.nonce !== body.nonce || t.operation !== a || clock() > t.expires || t.transportId !== body.transportId) fail('Confirmation expirée ou déjà utilisée.');
      const j = readyFor(c,a,t.revision);
      j.started = true;
      c.command(a === 'start' ? 'gcode:start' : 'gcode:resume');
      return {message:a === 'start' ? 'Démarrage demandé.' : 'Reprise demandée.'};
    }
    if (a === 'pause') {
      if (c.workflow.state !== 'running') fail('Aucun travail en cours.');
      r.ticket = null; c.command('gcode:pause');
      return {message:'Pause demandée. Attendre l’état Hold.'};
    }
    if (a === 'stop') {
      if (c.workflow.state === 'idle' && !['Run','Hold'].includes(controllerStatus(c).activeState)) fail('Aucun travail à arrêter.');
      r.ticket = null;
      if (r.job) r.job.started = true;
      c.command('gcode:stop',{force:true});
      return {message:'Arrêt demandé. Vérifiez l’immobilisation ; ce bouton ne remplace pas l’arrêt physique.'};
    }
    fail('Action inconnue.');
  }
  function list() {
    if (disposed) fail('Service indisponible.');
    const registry = controllers();
    for (const [c, r] of records) if (registry[c.options.port] !== c || c.isClose()) { motion.inspect(c.options.port); remove(c, r); }
    probeInput.sync();
    return Object.values(registry).filter(c=>c && !c.isClose() && c.type==='Grbl').map(snapshot);
  }
  function closeTransport(id) {
    transports.delete(id);
    records.forEach(r => { if (r.ticket && r.ticket.transportId === id) r.ticket = null; });
    changed();
  }
  return { action, previewMotion: motion.preview, list,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    openTransport(id) { transports.add(id); }, closeTransport,
    dispose() { disposed = true; listeners.clear(); transports.clear(); for (const [c,r] of records) remove(c,r); motion.dispose(); probeInput.dispose(); }
  };
}
function install(app, base, options = {}) {
  if (app.__cncTouchService) return app.__cncTouchService;
  const store = options.store || require(base+'/store').default, config = options.config || require(base+'/services/configstore').default;
  const settings = options.settings || require(base+'/config/settings').default;
  const apiBase = (settings.route || '').replace(/\/$/, '') + '/api';
  const service = createService(store,config);
  const routes = require('./touch-stream').installRoutes(app, service, Object.assign({}, options, {apiBase}));
  app.__cncTouchService = { service, dispose: routes.dispose, version: routes.version };
  return app.__cncTouchService;
}
module.exports = {createService,install};
