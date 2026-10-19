'use strict';
// Real isolated worker threads, offline browser/canvas adapters. No machine API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Worker } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');
const { scan } = require('./touch/library-preview.js');
const script = fs.readFileSync(path.join(__dirname, 'touch/library-preview.js'), 'utf8');
const harness = `
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parentPort,workerData}=require('node:worker_threads');
const context={setTimeout,clearTimeout,Promise,Date,Float64Array,Uint16Array,Number,String,Blob};
const originalText=Blob.prototype.text;
if(workerData.readerMode==='failure') Blob.prototype.text=function(){return Promise.reject(Error('Blob read failed'));};
if(workerData.readerMode==='pending') Blob.prototype.text=function(){return new Promise(()=>{});};
if(workerData.readerMode==='legacy') {
  Blob.prototype.text=undefined;
  context.FileReader=class {
    readAsText(blob){originalText.call(blob).then(text=>{this.result=text;this.onload();},()=>this.onerror());}
  };
}
context.self=context;
context.postMessage=(message,transfer)=>parentPort.postMessage(message,transfer);
context.importScripts=name=>vm.runInContext(fs.readFileSync(path.join(workerData.directory,name.split('?')[0]),'utf8'),context);
vm.createContext(context);
parentPort.on('message',message=>context.onmessage({data:message}));
vm.runInContext(fs.readFileSync(path.join(workerData.directory,'library-preview-worker.js'),'utf8'),context);
`;
function setup(options = {}) {
  const workers = [], intervals = new Set(), progress = [];
  const metrics = { inputBytes: 0, geometryBytes: 0, outstanding: 0, peak: 0, transfers: 0, responseBlobs: 0 };
  class BrowserWorker {
    constructor(url) {
      assert.match(url, /library-preview-worker\.js\?v=worker8$/);
      if (options.constructorFailure) throw Error('CSP denied');
      this.terminated = false;
      this.thread = new Worker(harness, { eval: true, workerData: { directory: path.join(__dirname, 'touch'), readerMode: options.readerMode } });
      workers.push(this);
      this.thread.on('message', message => {
        if (this.terminated) return;
        if (message.type === 'segments') {
          metrics.geometryBytes = Math.max(metrics.geometryBytes, message.data.byteLength);
          metrics.peak = Math.max(metrics.peak, ++metrics.outstanding);
        }
        if (options.badVersion && message.type === 'ready') message.version = 99;
        if (options.noResponse && message.type === 'ready') delete message.response;
        if (options.stale && message.type === 'bounds' && this.onmessage) this.onmessage({ data: { type: 'error', id: message.id - 1, message: 'obsolete' } });
        if (this.onmessage) this.onmessage({ data: message });
      });
      this.thread.on('error', error => { if (this.onerror) this.onerror({ message: error.message, preventDefault() {} }); });
    }
    postMessage(message, transfer) {
      assert.equal(typeof message.text, 'undefined', 'Never structured-clone the whole text');
      if (message.type === 'text') {
        metrics.inputBytes = Math.max(metrics.inputBytes, message.data.byteLength);
        assert.equal(transfer.length, 1); assert.equal(transfer[0], message.data);
        metrics.transfers++;
      }
      if (message.type === 'response') { assert(message.blob instanceof Blob); metrics.responseBlobs++; }
      if (message.type === 'ack') metrics.outstanding--;
      this.thread.postMessage(message, transfer);
      if (message.type === 'text') assert.equal(message.data.byteLength, 0, 'Text buffers must be transferred, not cloned');
    }
    terminate() { this.terminated = true; return this.thread.terminate(); }
  }
  const fileReaders = [];
  class Reader {
    constructor() { this.readyState = 0; fileReaders.push(this); }
    readAsDataURL() {
      this.readyState = 1;
      this.timer = setTimeout(() => {
        if (this.readyState !== 1) return;
        this.readyState = 2; this.result = 'data:image/png;base64,AAAA'; this.onload();
      }, options.encodeDelay || 0);
    }
    readAsText(blob) {
      this.readyState = 1;
      blob.text().then(text => {
        this.timer = setTimeout(() => {
          if (this.readyState !== 1) return;
          this.readyState = 2;
          if (options.localReadFailure) { this.onerror(); return; }
          this.result = text; this.onload();
        }, options.readDelay || 0);
      });
    }
    abort() { clearTimeout(this.timer); this.readyState = 2; this.aborted = true; }
  }
  const browser = { FileReader: Reader, Blob };
  if (!options.noWorker) browser.Worker = BrowserWorker;
  const context = {
    window: browser, document: { currentScript: { src: 'https://offline.invalid/touch/library-preview.js?v=worker8' } },
    Promise, Date, Uint16Array, Float64Array, setTimeout, clearTimeout,
    setInterval(fn, delay) { const timer = setInterval(fn, delay); intervals.add(timer); return timer; },
    clearInterval(timer) { clearInterval(timer); intervals.delete(timer); }
  };
  if (options.forbidUIParse) context.JSON = { parse() { throw Error('JSON.parse called on the UI thread'); }, stringify: JSON.stringify };
  vm.runInNewContext(script, context);
  let strokes = 0, position, endpoint;
  const lines = [], ctx = {
    fillRect() {}, beginPath() {},
    moveTo(x, y) { position = [x, y]; }, lineTo(x, y) { endpoint = [x, y]; },
    stroke() { strokes++; if (!options.noRecord) lines.push(position.concat(endpoint, this.strokeStyle)); }
  };
  const canvas = {
    getContext: () => ctx,
    toDataURL() { if (!options.synchronous) throw Error('Synchronous PNG unexpectedly used'); return 'data:image/png;base64,AAAA'; }
  };
  if (!options.synchronous) canvas.toBlob = callback => setTimeout(() => callback({ type: 'image/png' }), 0);
  return { api: browser.CNCLibraryPreview, canvas, workers, metrics, intervals, fileReaders, progress, lines,
    get strokes() { return strokes; },
    render: (text, cancelled = () => false) => browser.CNCLibraryPreview.render(text, canvas, cancelled, message => progress.push(message)),
    renderResponse: (blob, cancelled = () => false) => browser.CNCLibraryPreview.renderResponse(blob, canvas, cancelled, message => progress.push(message)),
    clean() { assert.equal(intervals.size, 0); assert(workers.every(worker => worker.terminated)); }
  };
}
async function run() {
  // A nearly maximum-size arc flushes several blocks in one line. Compare
  // every drawn endpoint/color with the supported parser's exact geometry.
  const code = 'G21 G90\nG0 X268000 Y0\nG3 X268000 Y0 I-268000\nG1 X0 Y0\n' +
    Array.from({ length: 3000 }, (_, i) => 'G1 X' + (i % 2)).join('\n') + '\nM2\n%\n';
  const segments = [], expected = await scan(code, (...values) => segments.push(values));
  const b = expected.bounds, scale = Math.min(880 / (b[2] - b[0] || 1), 440 / (b[3] - b[1] || 1));
  const ox = (960 - (b[2] - b[0]) * scale) / 2, oy = (540 - (b[3] - b[1]) * scale) / 2;
  const target = segments.map(([x,y,xx,yy,m]) => [ox + (x - b[0]) * scale, 540 - oy - (y - b[1]) * scale,
    ox + (xx - b[0]) * scale, 540 - oy - (yy - b[1]) * scale, m === 0 ? '#657c8f' : '#55d6ed']);
  const actual = setup({ stale: true }), rendered = await actual.render(code);
  assert.equal(rendered.segments, expected.count); assert.deepEqual(Array.from(rendered.bounds), expected.bounds);
  assert.equal(rendered.lines, expected.lines); assert.deepEqual(Array.from(rendered.trail), expected.trail, 'the progress trail crosses the worker boundary intact');
  assert.deepEqual(actual.lines, target); assert.equal(actual.strokes, expected.count);
  assert(actual.metrics.peak >= 1 && actual.metrics.peak <= 4);
  assert(expected.count > 11000, 'Dense arc plus lines span multiple transferred blocks');
  assert(actual.metrics.geometryBytes <= 81920); assert(actual.metrics.inputBytes <= 65536);
  assert(actual.progress.some(message => /Analyse du parcours/.test(message)));
  assert(actual.progress.includes('Dessin du parcours : 100 %'));
  assert(!/secours/.test(rendered.note)); actual.clean();

  // Exact UTF-16 transfer across block boundaries, including non-ASCII comments.
  const unicode = ';é😀' + 'x'.repeat(7000) + '\n';
  const chunked = setup({ noRecord: true });
  const unicodeResult = await chunked.render(unicode.repeat(15) + 'G1 X42');
  assert.equal(unicodeResult.segments, 1); assert(chunked.metrics.transfers > 1); chunked.clean();

  for (const code of ['G2 X10 R1', 'G1 X1 X2', 'G1 X1\n(unclosed', ';nothing']) {
    const invalid = setup(); await assert.rejects(invalid.render(code)); invalid.clean();
  }
  for (const options of [{ noWorker: true }, { constructorFailure: true }, { badVersion: true }]) {
    const fallback = setup(options), output = await fallback.render('G0 X2\nG3 X0 Y2 I-2');
    assert(output.segments > 2); assert.match(output.note, /Calcul local de secours/); fallback.clean();
  }
  const sync = setup({ noWorker: true, synchronous: true });
  assert.match((await sync.render('G1 X1')).note, /Encodage PNG synchrone de secours/); sync.clean();

  // Cancellation while a transferred arc is being drawn must terminate work,
  // settle the promise and stop all subsequent writes and owned timers.
  const cancel = setup({ noRecord: true }); let cancelled = false;
  // Repeated without its M2: lines after a program end are refused.
  const pending = cancel.render((code.replace('\nM2\n%\n', '\n')).repeat(40), () => cancelled);
  const trigger = setInterval(() => { if (cancel.strokes) cancelled = true; }, 1);
  await assert.rejects(pending, /Annulé/); clearInterval(trigger);
  const stoppedAt = cancel.strokes; await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(cancel.strokes, stoppedAt); cancel.clean();
  const encoding = setup({ encodeDelay: 100 }); let abortEncoding = false;
  const imagePromise = encoding.render('G1 X1', () => abortEncoding);
  const imageTrigger = setInterval(() => { if (encoding.fileReaders.length) abortEncoding = true; }, 1);
  await assert.rejects(imagePromise, /Annulé/); clearInterval(imageTrigger);
  assert(encoding.fileReaders[0].aborted); encoding.clean();
  const early = setup(); await assert.rejects(early.render('G1 X1', () => true), /Annulé/); assert.equal(early.workers.length, 0); early.clean();
  const excessive = setup(); await assert.rejects(excessive.render('x'.repeat(20 * 1048576 + 1)), /20 Mo/); excessive.clean();

  // The watch/file envelope never becomes responseText or a giant string on
  // the UI thread. A real Blob is cloned directly into the existing worker.
  const response = new Blob([JSON.stringify({ data: unicode.repeat(15) + code })], { type: 'application/json' });
  const remote = setup({ forbidUIParse: true });
  const remoteResult = await remote.renderResponse(response);
  assert.equal(remoteResult.segments, expected.count); assert.deepEqual(remote.lines, target);
  assert.equal(remote.metrics.responseBlobs, 1); assert.equal(remote.metrics.transfers, 0);
  assert(remote.metrics.peak <= 4); remote.clean();
  const legacy = setup({ readerMode: 'legacy', forbidUIParse: true });
  assert.equal((await legacy.renderResponse(new Blob(['{"data":"G1 X1"}']))).segments, 1); legacy.clean();
  for (const [body, message] of [['{broken', /illisible/], ['{}', /G-code absent/], ['{"data":42}', /G-code absent/],
    [JSON.stringify({ data: 'x'.repeat(20 * 1048576 + 1) }), /20 Mo/]]) {
    const bad = setup({ forbidUIParse: true }); await assert.rejects(bad.renderResponse(new Blob([body])), message); bad.clean();
  }
  const readError = setup({ readerMode: 'failure' });
  await assert.rejects(readError.renderResponse(new Blob(['{"data":"G1 X1"}'])), /Blob read failed/); readError.clean();
  const tooLargeResponse = setup();
  const giant = new Blob(Array(121).fill(new Blob(['x'.repeat(1048576)])));
  await assert.rejects(tooLargeResponse.renderResponse(giant), /volumineuse/);
  assert.equal(tooLargeResponse.workers.length, 0); tooLargeResponse.clean();
  const waitingResponse = setup({ readerMode: 'pending' }); let abortResponse = false;
  const responsePromise = waitingResponse.renderResponse(response, () => abortResponse);
  const responseTrigger = setInterval(() => { if (waitingResponse.metrics.responseBlobs) abortResponse = true; }, 1);
  await assert.rejects(responsePromise, /Annulé/); clearInterval(responseTrigger); waitingResponse.clean();
  const earlyResponse = setup();
  await assert.rejects(earlyResponse.renderResponse(response, () => true), /Annulé/);
  assert.equal(earlyResponse.workers.length, 0); earlyResponse.clean();
  for (const options of [{ noWorker: true }, { constructorFailure: true }, { badVersion: true }, { noResponse: true }]) {
    const fallbackResponse = setup(options);
    const result = await fallbackResponse.renderResponse(new Blob(['{"data":"G1 X1"}']));
    assert.equal(result.segments, 1); assert.match(result.note, /Calcul local de secours/); fallbackResponse.clean();
    const refusedResponse = setup(options);
    await assert.rejects(refusedResponse.renderResponse(new Blob([' '.repeat(262145)])), /Worker requis/);
    assert.equal(refusedResponse.fileReaders.length, 0); refusedResponse.clean();
  }
  const brokenLocal = setup({ noWorker: true });
  await assert.rejects(brokenLocal.renderResponse(new Blob(['{broken'])), /illisible/); brokenLocal.clean();
  const failedLocal = setup({ noWorker: true, localReadFailure: true });
  await assert.rejects(failedLocal.renderResponse(new Blob(['{"data":"G1 X1"}'])), /Lecture de la réponse/); failedLocal.clean();
  const localResponse = setup({ noWorker: true, readDelay: 100 }); let abortLocal = false;
  const localPromise = localResponse.renderResponse(new Blob(['{"data":"G1 X1"}']), () => abortLocal);
  setTimeout(() => { abortLocal = true; }, 10);
  await assert.rejects(localPromise, /Annulé/); assert(localResponse.fileReaders[0].aborted); localResponse.clean();

  if (process.argv.includes('--20mb')) {
    for (const [fixture, line] of [['comments', 'G1 X1 (' + 'comment '.repeat(100) + ')\nG1 X2\n'], ['dense-lines', 'G1 X1 Y1\nG1 X2 Y2\n']]) {
      const bytes = 20 * 1048576, remainder = bytes % line.length;
      const text = line.repeat(Math.floor(bytes / line.length)) + (remainder ? ';' + 'x'.repeat(remainder - 1) : '');
      assert.equal(Buffer.byteLength(text), bytes);
      const bench = setup({ noRecord: true }), started = performance.now(); let last = started, maxGap = 0;
      const heartbeat = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; }, 5);
      const preview = await bench.render(text); clearInterval(heartbeat); bench.clean();
      console.log(JSON.stringify({ scope: 'Node worker + fake canvas, NOT Surface or real PNG/browser', fixture, bytes,
        segments: preview.segments, elapsedMs: Math.round(performance.now() - started), maxHeartbeatGapMs: Math.round(maxGap),
        peakGeometryBlocks: bench.metrics.peak, maxGeometryBytes: bench.metrics.geometryBytes, maxInputBytes: bench.metrics.inputBytes }));
      if (fixture === 'comments') {
        // Build the HTTP fixture before measuring. In production XHR provides
        // this Blob directly; UI code never calls JSON.stringify/parse on it.
        const payload = new Blob([JSON.stringify({ data: text })]), remoteBench = setup({ noRecord: true, forbidUIParse: true });
        const responseStarted = performance.now(); last = responseStarted; maxGap = 0;
        const responseHeartbeat = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; }, 5);
        const remotePreview = await remoteBench.renderResponse(payload); clearInterval(responseHeartbeat); remoteBench.clean();
        assert.equal(remotePreview.segments, preview.segments);
        console.log(JSON.stringify({ scope: 'Node worker + Blob HTTP response + fake canvas, NOT Surface or real PNG/browser', fixture, bytes, responseBytes: payload.size,
          segments: remotePreview.segments, elapsedMs: Math.round(performance.now() - responseStarted), maxHeartbeatGapMs: Math.round(maxGap),
          peakGeometryBlocks: remoteBench.metrics.peak, maxGeometryBytes: remoteBench.metrics.geometryBytes, textTransfersToUI: 0 }));
      }
    }
  }
  console.log('PASS: real isolated worker, exact geometry/arcs/Unicode, bounded transfer/backpressure, progress/cancellation/cleanup, Blob response JSON off UI, malformed/oversized/read errors, bounded no-Worker fallback.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
