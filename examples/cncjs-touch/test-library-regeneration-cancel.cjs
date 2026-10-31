'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const { createDOM } = require('./dom-fixture.cjs');
const source = fs.readFileSync(__dirname + '/touch/shared-library.js', 'utf8');
const flush = () => new Promise(setImmediate);
const files = ['a.nc', 'b.nc'].map((name, index) => ({ type: 'f', name, size: 20 * 1048576, mtime: '2026-10-' + (14 - index) }));
const metadata = name => ({ data: JSON.stringify({ version: 1, file: name, originalName: name, previewError: 'none' }) });
const preview = { image: 'data:image/png;base64,AA==', bounds: [0, 0, 1, 1], segments: 1 };

async function fixture() {
  const { document, node } = createDOM(['files']), pending = [], requests = [], renders = [], events = [];
  let obsoleteParses = 0;
  const context = {
    document, CustomEvent: function (type, options) { this.type = type; this.detail = options.detail; },
    window: { addEventListener() {}, dispatchEvent(event) { events.push(event); },
      CNCLibraryPreview: { renderResponse(blob, canvas, cancelled, progress) {
        assert(blob instanceof Blob, 'Opaque watch response goes straight to the preview Worker');
        return new Promise((resolve, reject) => renders.push({ blob, cancelled, progress, resolve, reject }));
      } } },
    JSON: { stringify: JSON.stringify, parse(text) {
      if (text === 'OBSOLETE_RESPONSE_MUST_NOT_BE_PARSED') obsoleteParses++;
      return JSON.parse(text);
    } },
    localStorage: { getItem: () => '{"state":{"session":{"token":"fake"}}}' },
    XMLHttpRequest: function () {
      this.open = (method, url) => { this.method = method; this.url = url; };
      this.headers = {};
      this.setRequestHeader = (key, value) => { this.headers[key] = value; };
      this.send = body => { this.body = body && JSON.parse(body); pending.push(this); requests.push(this); };
      this.abort = () => { this.aborted = true; this.onabort(); };
    }
  };
  vm.runInNewContext(source, context);
  function take(method, endpoint, file) {
    const index = pending.findIndex(xhr => xhr.method === method && xhr.url.endsWith('/' + endpoint) && (file === undefined || xhr.body.file === file));
    assert(index >= 0, 'expected ' + method + ' ' + endpoint + ' ' + (file || ''));
    return pending.splice(index, 1)[0];
  }
  function reply(xhr, value) {
    xhr.status = 200;
    if (xhr.responseType === 'blob') {
      xhr.response = new Blob([JSON.stringify(value)], { type: 'application/json' });
      Object.defineProperty(xhr, 'responseText', { get() { throw Error('Large JSON responseText must never be read on the UI thread'); } });
    } else xhr.responseText = JSON.stringify(value);
    xhr.onload();
  }
  function obsoleteReply(xhr) { xhr.status = 200; xhr.responseText = 'OBSOLETE_RESPONSE_MUST_NOT_BE_PARSED'; xhr.onload(); }
  async function select(name) {
    node('library-list').children.find(button => button._file.name === name).handlers.click();
    reply(take('POST', 'file', name + '.cnctouch.json'), metadata(name)); await flush();
  }
  function start(name) { node('library-regenerate').handlers.click(); return take('POST', 'file', name + '.cnctouch.json'); }
  async function gcode(name) {
    reply(start(name), metadata(name)); await flush();
    const xhr = take('POST', 'file', name);
    assert.equal(xhr.responseType, 'blob'); assert.equal(xhr.headers.Authorization, 'Bearer fake');
    assert.equal(xhr.headers['Content-Type'], 'application/json');
    return xhr;
  }
  async function drawing(name) { reply(await gcode(name), { data: 'G0 X0\nG1 X1' }); await flush(); return renders.shift(); }
  reply(take('GET', 'status'), { configured: true }); await flush();
  reply(take('POST', 'files'), { files }); await flush();
  reply(take('POST', 'file', 'a.nc.cnctouch.json'), metadata('a.nc')); await flush();
  return { node, requests, renders, events, take, reply, obsoleteReply, select, start, gcode, drawing, obsoleteParses: () => obsoleteParses };
}

(async () => {
  // Cancelling metadata must prevent even starting the old 20 MiB download.
  let f = await fixture(), old = f.start('a.nc');
  await f.select('b.nc'); assert(old.aborted);
  const newer = f.start('b.nc');
  f.obsoleteReply(old); await flush();
  assert.equal(f.obsoleteParses(), 0);
  assert(!f.requests.some(xhr => xhr.body && xhr.body.file === 'a.nc'));
  assert.equal(f.node('library-regenerate-status').textContent, 'Lecture du fichier enregistré…');
  const before = f.requests.length; f.node('library-regenerate').handlers.click();
  assert.equal(f.requests.length, before, 'old completion cannot unlock the newer regeneration');
  assert(!newer.aborted);

  // An already requested G-code is aborted, and even a late load cannot parse it.
  f = await fixture(); old = await f.gcode('a.nc');
  await f.select('b.nc'); assert(old.aborted); f.obsoleteReply(old); await flush();
  assert.equal(f.obsoleteParses(), 0); assert.equal(f.renders.length, 0);
  assert.equal(f.node('library-regenerate-status').textContent, '');

  // A -> B -> A still cancels the old worker by generation, not filename alone.
  f = await fixture(); const render = await f.drawing('a.nc');
  await f.select('b.nc'); await f.select('a.nc'); assert(render.cancelled());
  render.progress('Obsolete progress'); render.resolve(preview); await flush();
  assert.equal(f.node('library-regenerate-status').textContent, '');
  assert(!f.requests.some(xhr => xhr.method === 'PUT'));

  // Authentication and network failures cannot pass an error body to rendering.
  for (const kind of ['unauthorized', 'network', 'timeout']) {
    f = await fixture(); old = await f.gcode('a.nc');
    Object.defineProperty(old, 'response', { get() { throw Error('Do not read a failed HTTP response'); } });
    if (kind === 'unauthorized') { old.status = 401; old.onload(); }
    else if (kind === 'network') old.onerror();
    else old.ontimeout();
    await flush(); assert.equal(f.renders.length, 0);
    assert.match(f.node('library-regenerate-status').textContent, /Aperçu non modifié/);
    assert(!f.requests.some(xhr => xhr.method === 'PUT'));
  }
  assert.equal(f.requests.filter(xhr => xhr.url.endsWith('/files')).length, 1);

  // Cancellation during the final freshness read prevents the metadata write.
  f = await fixture(); (await f.drawing('a.nc')).resolve(preview); await flush();
  old = f.take('POST', 'files'); await f.select('b.nc'); assert(old.aborted);
  f.obsoleteReply(old); await flush(); assert.equal(f.obsoleteParses(), 0);
  assert(!f.requests.some(xhr => xhr.method === 'PUT'));

  // A write already transmitted completes and invalidates A without replacing B's status.
  f = await fixture(); (await f.drawing('a.nc')).resolve(preview); await flush();
  f.reply(f.take('POST', 'files'), { files }); await flush();
  const write = f.take('PUT', 'file', 'a.nc.cnctouch.json');
  await f.select('b.nc'); f.start('b.nc'); assert(!write.aborted);
  f.reply(write, {}); await flush();
  assert.equal(f.node('library-regenerate-status').textContent, 'Lecture du fichier enregistré…');
  assert(f.events.some(event => event.type === 'cnc-library-preview-updated' && event.detail.file === 'a.nc'));
  console.log('PASS regeneration cancellation: abort metadata/G-code/freshness reads, skip obsolete parse/download/render, generation guard and preserve transmitted write/new status.');
})().catch(error => { console.error(error); process.exitCode = 1; });
