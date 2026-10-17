/* Response decoding and geometry only. No controller, network or canvas API. */
(function () {
  'use strict';
  importScripts('library-preview.js?v=worker6');
  var job = null, maxText = 20 * 1048576, blockSize = 2048;
  // Geometry blocks in flight before parsing pauses: parsing and drawing overlap
  // instead of alternating one block at a time. The renderer refuses a fourth.
  var maxOutstanding = 3;
  function send(type, fields, transfer) {
    var message = fields || {}; message.type = type; message.id = job && job.id;
    self.postMessage(message, transfer || []);
  }
  function fail(error) {
    if (!job || job.failed) return;
    job.failed = true; job.parts = []; job.text = '';
    if (job.resume) { var resume = job.resume; job.resume = null; resume(); }
    send('error', { message: error.message || String(error) });
  }
  function parse(text) {
    var state = job, data = new Float64Array(blockSize * 5), used = 0, sequence = 0, pending = {}, outstanding = 0;
    function cancelled() { return state !== job || state.failed; }
    function flush() {
      if (!used) return;
      var trimmed = used === data.length ? data : new Float64Array(used);
      if (trimmed !== data) trimmed.set(data.subarray(0, used));
      var buffer = trimmed.buffer;
      pending[++sequence] = true; outstanding++;
      send('segments', { sequence: sequence, data: buffer }, [buffer]);
      data = new Float64Array(blockSize * 5); used = 0;
    }
    // Resolves once fewer than `limit` blocks are outstanding.
    function waitBelow(limit) {
      if (outstanding < limit) return null;
      return new Promise(function (resolve) { state.resume = resolve; state.resumeBelow = limit; });
    }
    function pressure() { return waitBelow(maxOutstanding); }
    function drain() { return waitBelow(1); }
    state.ack = function (number) {
      if (!pending[number]) { fail(new Error('Acquittement de parcours invalide')); return; }
      delete pending[number]; outstanding--;
      if (state.resume && outstanding < state.resumeBelow) { var resume = state.resume; state.resume = null; resume(); }
    };
    // Joining and both parsing passes happen in the worker. Only bounded text
    // and geometry blocks cross the UI boundary; never the whole G-code.
    state.text = typeof text === 'string' ? text : state.parts.join(''); state.parts = [];
    var lastPercent = -1;
    self.CNCLibraryPreview.scan(state.text, null, cancelled, function (p) {
      var percent = Math.floor(p * 100);
      if (percent !== lastPercent) { lastPercent = percent; send('progress', { value: p }); }
    }).then(function (result) {
      if (cancelled()) return;
      if (!result.count) throw new Error('Aucun déplacement XY');
      send('bounds', { result: result });
      return self.CNCLibraryPreview.scan(state.text, function (x, y, xx, yy, mode) {
        data[used++] = x; data[used++] = y; data[used++] = xx; data[used++] = yy; data[used++] = mode;
        if (used === data.length) flush();
      }, cancelled, null, pressure).then(function () {
        flush(); return drain();
      }).then(function () {
        if (cancelled()) return;
        state.text = ''; send('done');
      });
    }).catch(fail);
  }
  function readResponse(blob) {
    var reading;
    // FileReaderSync covers older dedicated workers; Blob.text is used where
    // available. Both decoding and JSON.parse remain off the UI thread.
    if (typeof blob.text === 'function') reading = blob.text();
    else if (typeof FileReaderSync === 'function') reading = Promise.resolve(new FileReaderSync().readAsText(blob, 'UTF-8'));
    else reading = new Promise(function (resolve, reject) {
      if (typeof FileReader !== 'function') { reject(new Error('Lecture du fichier impossible dans le Worker')); return; }
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Lecture de la réponse du serveur impossible')); };
      reader.readAsText(blob, 'UTF-8');
    });
    reading.then(function (raw) {
      if (!job || job.failed) return;
      var value;
      try { value = JSON.parse(raw); } catch (_) { throw new Error('Réponse du serveur illisible.'); }
      if (!value || typeof value.data !== 'string') throw new Error('G-code absent de la réponse du serveur');
      if (value.data.length > maxText) throw new Error('G-code texte : 20 Mo maximum');
      parse(value.data);
    }).catch(fail);
  }
  self.onmessage = function (event) {
    var message = event.data || {};
    try {
      if (message.type === 'response') {
        if (job || typeof message.id !== 'number' || !isFinite(message.id) || message.id % 1 || typeof Blob !== 'function' || !(message.blob instanceof Blob) || message.blob.size > 6 * maxText + 65536) throw new Error('Réponse du serveur invalide ou trop volumineuse');
        job = { id: message.id, parts: [], started: true, failed: false };
        readResponse(message.blob); return;
      }
      if (message.type === 'begin') {
        if (job || typeof message.id !== 'number' || !isFinite(message.id) || message.id % 1 || typeof message.length !== 'number' || !isFinite(message.length) || message.length % 1 || message.length < 0 || message.length > maxText) throw new Error('Demande d’aperçu invalide');
        job = { id: message.id, length: message.length, offset: 0, parts: [], started: false, failed: false };
        send('input', { offset: 0 }); return;
      }
      if (!job || job.failed || message.id !== job.id) return;
      if (message.type === 'text') {
        var buffer = message.data;
        if (job.started || message.offset !== job.offset || !buffer || !buffer.byteLength || buffer.byteLength > 65536 || buffer.byteLength % 2) throw new Error('Bloc de texte invalide');
        var words = new Uint16Array(buffer);
        if (job.offset + words.length > job.length) throw new Error('Texte plus long qu’annoncé');
        // Keep apply's argument count modest on older engines.
        for (var i = 0; i < words.length; i += 8192) job.parts.push(String.fromCharCode.apply(null, words.subarray(i, i + 8192)));
        job.offset += words.length; send('input', { offset: job.offset });
      } else if (message.type === 'end') {
        if (job.started || job.offset !== job.length) throw new Error('Transfert du G-code incomplet');
        job.started = true; parse();
      } else if (message.type === 'ack') {
        if (!job.ack) throw new Error('Acquittement inattendu');
        job.ack(message.sequence);
      } else throw new Error('Message d’aperçu inconnu');
    } catch (error) { fail(error); }
  };
  self.postMessage({ type: 'ready', version: 1, response: true });
})();
