'use strict';
// Offline: fake frames, long tasks, WebGL and downloads. No network, no machine.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { createDOM } = require('./dom-fixture.cjs');
function fixture(options = {}) {
  const dom = createDOM(['menu']), handlers = {}, frames = [], intervals = new Map(), saved = [], observers = [];
  let clock = 1000, next = 0;
  const originalCreate = dom.document.createElement;
  dom.document.createElement = function (tag) {
    const el = originalCreate(tag); el.style = {};
    if (tag === 'canvas') {
      el.getContext = () => options.noWebGL ? null : {
        VENDOR: 1, RENDERER: 2,
        getExtension: name => name === 'WEBGL_debug_renderer_info' ? { UNMASKED_VENDOR_WEBGL: 3, UNMASKED_RENDERER_WEBGL: 4 } : null,
        getParameter: id => id === 3 ? 'Google Inc.' : id === 4 ? (options.renderer || 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))') : ''
      };
    }
    return el;
  };
  dom.document.body.getAttribute = () => 'true';
  const window = {
    location: { search: options.search === undefined ? '?perf=1' : options.search },
    navigator: { userAgent: 'Fixture/1.0', hardwareConcurrency: 4, deviceMemory: 2 }, screen: { width: 1366, height: 768 }, innerWidth: 1366, innerHeight: 768, devicePixelRatio: 1,
    performance: { now: () => clock, memory: { usedJSHeapSize: 40 * 1048576 } },
    addEventListener(name, fn) { const previous = handlers[name]; handlers[name] = previous ? e => { previous(e); fn(e); } : fn; },
    dispatchEvent(e) { if (handlers[e.type]) handlers[e.type](e); },
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; }, cancelAnimationFrame() { frames.length = 0; },
    setInterval(fn, ms) { assert.equal(ms, 1000); intervals.set(++next, fn); return next; }, clearInterval(id) { intervals.delete(id); },
    Blob, CNCDownload: { save(blob, name) { if (options.failSave) throw Error('declined'); saved.push({ blob, name }); } },
    cncI18n: { t: s => s, language: 'fr' }, document: dom.document
  };
  if (!options.noObserver) {
    window.PerformanceObserver = class { constructor(fn) { this.fn = fn; observers.push(this); } observe() { this.observed = true; } disconnect() { this.disconnected = true; } };
  }
  if (options.preview) window.CNCLibraryPreview = options.preview;
  const context = { window, document: dom.document, Date, JSON, Math, String, RegExp };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/touch/perf-harness.js', 'utf8'), context);
  return { ...dom, window, handlers, frames, intervals, saved, observers,
    advance(ms) { clock += ms; }, get clock() { return clock; },
    frame(timestamp) { const fn = frames.shift(); assert(fn, 'a frame must be scheduled'); clock = timestamp; fn(timestamp); },
    tickInterval() { for (const fn of intervals.values()) fn(); } };
}
const flush = () => new Promise(setImmediate);
(async () => {
  // Inactive without ?perf=1: nothing scheduled, nothing added, no listeners.
  for (const search of ['', '?x=1', '?perf=0', '?perf=12']) {
    const off = fixture({ search });
    assert.equal(off.frames.length, 0); assert.equal(off.intervals.size, 0); assert.equal(off.document.body.children.length, 0);
    assert.deepEqual(Object.keys(off.handlers), []); assert.equal(off.window.cncPerfHarness, undefined);
  }
  for (const search of ['?perf=1', '?a=b&perf=1', '?perf=1&a=b']) assert(fixture({ search }).window.cncPerfHarness);

  // Frames, long tasks, screens, memory, software renderer and export.
  const progress = [];
  const preview = { render: (text, canvas, cancelled, report) => { report('Analyse du parcours : 50 %'); report('Dessin du parcours : 10 %'); report('Encodage de l’image PNG…'); return Promise.resolve({ segments: 42 }); },
    renderResponse: () => Promise.reject(new Error('Réponse illisible')) };
  const f = fixture({ preview });
  const badge = f.document.body.children[0];
  assert.equal(badge.id, 'perf-harness'); assert.equal(badge.tagName, 'BUTTON'); assert.match(badge.attributes['aria-label'], /performance/);
  assert.equal(f.observers.length, 1); assert(f.observers[0].observed);
  [0, 16, 32, 100, 116, 132].forEach(t => f.frame(t)); // gaps 16 16 68 16 16
  f.observers[0].fn({ getEntries: () => [{ duration: 80 }, { duration: 120 }] });
  f.window.dispatchEvent({ type: 'cnc-screen-change', detail: 'files' }); f.advance(500);
  f.window.dispatchEvent({ type: 'cnc-screen-change', detail: 'home' }); f.advance(250);
  f.window.dispatchEvent({ type: 'cnc-job-status', detail: {} }); f.window.dispatchEvent({ type: 'cnc-job-status', detail: {} });
  f.tickInterval(); assert.match(badge.textContent, /^perf 16 ms · p95 68 · LT 2 · CPU$/);
  const rendered = await f.window.CNCLibraryPreview.render('G1 X1', {}, () => false, m => progress.push(m));
  assert.equal(rendered.segments, 42); assert.equal(progress.length, 3, 'progress messages still reach the caller');
  await assert.rejects(f.window.CNCLibraryPreview.renderResponse(new Blob(['x']), {}, () => false), /illisible/);
  badge.click(); await flush();
  assert.equal(f.saved.length, 1); assert.match(f.saved[0].name, /^cnc-touch-perf-\d{14}\.json$/); assert.equal(badge.textContent, 'Rapport exporté');
  const report = JSON.parse(await f.saved[0].blob.text());
  assert.equal(report.format, 'cnc-touch-perf-report'); assert.equal(report.frames.count, 5); assert.equal(report.frames.maxMs, 68); assert.equal(report.frames.over50Ms, 1);
  assert.equal(report.frames.medianMs, 16); assert.equal(report.longTasks.count, 2); assert.equal(report.longTasks.totalMs, 200); assert.equal(report.longTasks.maxMs, 120);
  assert.equal(report.renderer.software, true); assert.match(report.renderer.renderer, /SwiftShader/);
  assert.equal(report.device.hardwareConcurrency, 4); assert.equal(report.device.simulation, true); assert.equal(report.statusEvents, 2);
  assert.equal(report.screens.files.visits, 1); assert.equal(report.screens.files.ms, 500); assert.equal(report.screens.home.visits, 1); assert.equal(report.screens.menu.visits, 1);
  assert.equal(report.memoryMb.maxMb, 40); assert.equal(report.previewRenders.length, 2);
  assert.deepEqual(Object.keys(report.previewRenders[0].phaseStartMs), ['analyse', 'dessin', 'encodage']); assert.equal(report.previewRenders[0].outcome, 'ok');
  assert.equal(report.previewRenders[1].outcome, 'Réponse illisible'); assert.equal(report.previewRenders[1].method, 'renderResponse');
  assert(!JSON.stringify(report).includes('G1 X1'), 'G-code never enters the report');

  // Hidden page: the first gap after returning is ignored.
  f.handlers.pagehide({ persisted: true }); f.document.handlers.visibilitychange(); f.frame(5000); f.frame(5016);
  assert.equal(f.window.cncPerfHarness.report().frames.maxMs, 68);

  // Export failure is reported on the badge; a hardware renderer and a missing WebGL are classified.
  const failing = fixture({ failSave: true }); failing.document.body.children[0].click(); assert.equal(failing.document.body.children[0].textContent, 'Export impossible');
  assert.equal(fixture({ renderer: 'Mali-T760' }).window.cncPerfHarness.report().renderer.software, false);
  assert.equal(fixture({ noWebGL: true }).window.cncPerfHarness.report().renderer.renderer, 'webgl-unavailable');
  const plain = fixture({ noObserver: true }); assert.equal(plain.window.cncPerfHarness.report().longTasks.observed, false);

  // Leaving the page stops frames, the observer and the ticker.
  f.handlers.pagehide({ persisted: false });
  assert.equal(f.frames.length, 0); assert(f.observers[0].disconnected); assert.equal(f.intervals.size, 0);
  f.frame = null;
  for (const name of ['index.html', 'simulation.html']) {
    const html = fs.readFileSync(__dirname + '/touch/' + name, 'utf8');
    assert.equal((html.match(/src="perf-harness\.js/g) || []).length, 1);
    assert(html.indexOf('download-file.js') < html.indexOf('perf-harness.js')); assert(html.indexOf('library-preview.js') < html.indexOf('perf-harness.js'));
    assert(html.indexOf('perf-harness.js') < html.indexOf('startup-ready.js'));
  }
  console.log('PASS perf harness: opt-in only, frame/long-task/screen/memory statistics, software renderer detection, preview phase timing, JSON export, hidden-page gap, disposal; no network, no machine, no G-code in reports.');
})().catch(error => { console.error(error); process.exitCode = 1; });
