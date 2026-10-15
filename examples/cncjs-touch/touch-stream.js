'use strict';
const crypto = require('crypto');
const VERSION = '3.0.0';

// One authenticated, bounded HTTP response; never joins a controller socket or sends G-code.
function installRoutes(app, service, options = {}) {
  const base = options.apiBase || '/api', clients = new Set();
  const clock = options.clock || Date.now, timers = options.timers || {setInterval, clearInterval, setTimeout, clearTimeout};
  const epoch = crypto.randomBytes(12).toString('hex');
  let sequence = 0, scheduled = null, disposed = false, lastSignature = '', lastPublished = 0;
  const snapshot = () => ({version:1, epoch, sequence:++sequence, sentAt:clock(), controllers:service.list()});
  function authenticated(req, res, next) {
    // express-jwt populates req.user. Do not inherit CNCjs development-mode bypass.
    if (!req.user || typeof req.user !== 'object') return res.status(401).send({message:'Session CNCjs requise.'});
    next();
  }
  function send(client, packet) {
    if (client.closed) return;
    try {
      const line = JSON.stringify(Object.assign({}, packet, {transportId:client.id})) + '\n';
      client.bytes += Buffer.byteLength(line);
      if (client.bytes > 512 * 1024 || clock() - client.started >= 60000) { client.close(true); return; }
      if (client.res.write(line) === false) { client.close(); return; }
      if (typeof client.res.flush === 'function') client.res.flush();
    } catch (_) { client.close(); }
  }
  function publish() {
    if (disposed || !clients.size) return;
    if (scheduled !== null) { timers.clearTimeout(scheduled); scheduled = null; }
    try {
      const packet = snapshot();
      const signature = JSON.stringify(packet.controllers, (key,value) => ['statusAgeMs','statusObservedAt','ageMs','observedAt'].includes(key) ? undefined : value);
      if (signature === lastSignature && clock() - lastPublished < 1000) return;
      lastSignature = signature; lastPublished = clock();
      clients.forEach(client => send(client, packet));
    }
    catch (_) { Array.from(clients).forEach(client => client.close()); }
  }
  // Raw reports trigger a coalesced snapshot; the 1 s tick also discovers registry changes
  // and expires stale reports. A heartbeat never modifies the raw report timestamps.
  const unsubscribe = service.subscribe(() => {
    if (clients.size && scheduled === null && !disposed) scheduled = timers.setTimeout(() => { scheduled = null; publish(); }, 150);
  });
  const heartbeat = timers.setInterval(publish, 1000);
  if (options.health !== false) app.get(base+'/custom/health', authenticated, (req,res) => res.send({loaded:true,version:VERSION,protocol:1,transport:'ndjson'}));
  app.get(base+'/touch-job', authenticated, (req,res) => {
    try { res.send(snapshot()); } catch (_) { res.status(500).send({message:'État indisponible.'}); }
  });
  app.post(base+'/touch-job', authenticated, (req,res) => service.action(req.body)
    .then(result => { res.send(Object.assign({}, result, {snapshot:snapshot()})); publish(); })
    .catch(e => res.status(e.status || 400).send({message:e.message})));
  app.post(base+'/touch-motion/preview', authenticated, (req,res) => {
    try { res.send(service.previewMotion(req.body)); }
    catch(e) { res.status(e.code ? 409 : 500).send({message:e.code ? e.message : 'Vérification serveur indisponible.'}); }
  });
  app.get(base+'/touch-events', authenticated, (req,res) => {
    if (disposed || clients.size >= 8) return res.status(503).send({message:'Suivi indisponible.'});
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    const client = {res, id:crypto.randomBytes(16).toString('hex'), started:clock(), bytes:0, closed:false};
    client.close = rotate => {
      if (client.closed) return;
      client.closed = true; clients.delete(client); service.closeTransport(client.id);
      res.removeListener('close', onClose); req.removeListener('aborted', onClose);
      if (rotate && !res.destroyed) res.write(JSON.stringify({rotate:true})+'\n');
      res.end();
    };
    function onClose() { client.close(); }
    res.on('close', onClose); req.on('aborted', onClose);
    service.openTransport(client.id); clients.add(client);
    try { send(client, snapshot()); } catch (_) { client.close(); }
  });
  return {version:VERSION, publish, snapshot, dispose() {
    if (disposed) return;
    disposed = true; unsubscribe(); timers.clearInterval(heartbeat);
    if (scheduled !== null) timers.clearTimeout(scheduled);
    Array.from(clients).forEach(client => client.close()); service.dispose();
  }};
}
module.exports = {installRoutes, VERSION};
