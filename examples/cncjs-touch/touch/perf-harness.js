/* Device measurement harness. Inactive unless the page is opened with ?perf=1.
 * Records frame gaps, long tasks, memory, preview phases and the WebGL renderer
 * (software rendering is the expected case on a Tegra 3 under Linux), then
 * exports one JSON report through the existing download helper. It never
 * reads machine state for its own purposes and sends no command. */
(function (root) {
  'use strict';
  var search = (root.location && root.location.search) || '';
  if (!/[?&]perf=1(?:&|$)/.test(search)) return;
  var doc = root.document, uiLocale = root.cncI18n || { t: function (s) { return s; } };
  function now() { return root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now(); }
  var started = now(), startedAt = new Date().toISOString(), disposed = false;
  // Frame gaps: a bounded ring of samples plus running totals. Gaps over 50 ms are visible stutters.
  var GAP_LIMIT = 6000, gaps = [], frames = 0, worstGap = 0, slowFrames = 0, lastFrame = null, frame = null;
  var longTasks = { count: 0, totalMs: 0, maxMs: 0 }, observer = null;
  var memory = { samples: 0, minMb: null, maxMb: null };
  var screens = {}, activeScreen = 'menu', screenSince = started, statusEvents = 0, renders = [];
  var badge = null, ticker = null, gpu = renderer();

  function renderer() {
    var info = { vendor: '', renderer: '', software: null };
    try {
      var canvas = doc.createElement('canvas');
      var gl = typeof canvas.getContext === 'function' && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      if (!gl) { info.renderer = 'webgl-unavailable'; info.software = true; return info; }
      var debug = gl.getExtension('WEBGL_debug_renderer_info');
      info.vendor = String(gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR) || '');
      info.renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
      info.software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(info.vendor + ' ' + info.renderer);
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (_) { info.renderer = info.renderer || 'error'; }
    return info;
  }
  function device() {
    var nav = root.navigator || {}, screen = root.screen || {};
    return {
      userAgent: nav.userAgent || '', hardwareConcurrency: nav.hardwareConcurrency || null, deviceMemoryGb: nav.deviceMemory || null,
      devicePixelRatio: root.devicePixelRatio || 1, viewport: [root.innerWidth || 0, root.innerHeight || 0], screen: [screen.width || 0, screen.height || 0],
      language: (root.cncI18n && root.cncI18n.language) || '', simulation: !!(doc.body && doc.body.getAttribute('data-simulation') === 'true')
    };
  }
  function tick(timestamp) {
    frame = null; if (disposed) return;
    var t = typeof timestamp === 'number' ? timestamp : now();
    if (lastFrame !== null) {
      var gap = t - lastFrame;
      if (gap >= 0) {
        frames++; if (gaps.length < GAP_LIMIT) gaps.push(gap); else gaps[frames % GAP_LIMIT] = gap;
        if (gap > worstGap) worstGap = gap;
        if (gap > 50) slowFrames++;
      }
    }
    lastFrame = t;
    frame = root.requestAnimationFrame(tick);
  }
  function percentile(values, p) {
    if (!values.length) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] * 10) / 10;
  }
  function sampleMemory() {
    var m = root.performance && root.performance.memory;
    if (!m || !m.usedJSHeapSize) return;
    var mb = Math.round(m.usedJSHeapSize / 1048576 * 10) / 10;
    memory.samples++;
    if (memory.minMb === null || mb < memory.minMb) memory.minMb = mb;
    if (memory.maxMb === null || mb > memory.maxMb) memory.maxMb = mb;
  }
  function accountScreen() {
    var t = now(), entry = screens[activeScreen] || (screens[activeScreen] = { visits: 0, ms: 0 });
    entry.ms += Math.max(0, Math.round(t - screenSince)); screenSince = t;
  }
  function wrapPreview() {
    var api = root.CNCLibraryPreview;
    if (!api || api.perfHarness) return;
    ['render', 'renderResponse'].forEach(function (name) {
      var original = api[name];
      if (typeof original !== 'function') return;
      api[name] = function (input, canvas, cancelled, progress) {
        var t0 = now(), phases = {}, size = typeof input === 'string' ? input.length : (input && input.size) || null;
        function record(segments, outcome) {
          if (renders.length >= 20) renders.shift();
          renders.push({ method: name, inputSize: size, segments: segments, totalMs: Math.round(now() - t0), phaseStartMs: phases, outcome: outcome });
        }
        function mark(message) {
          var key = /Analyse/.test(message) ? 'analyse' : /Dessin/.test(message) ? 'dessin' : /Encodage/.test(message) ? 'encodage' : null;
          if (key && phases[key] === undefined) phases[key] = Math.round(now() - t0);
          if (typeof progress === 'function') progress(message);
        }
        return original.call(this, input, canvas, cancelled, mark).then(function (result) {
          record(result && result.segments, 'ok'); return result;
        }, function (error) {
          record(null, (error && error.message) || 'error'); throw error;
        });
      };
    });
    api.perfHarness = true;
  }
  function report() {
    accountScreen();
    return {
      format: 'cnc-touch-perf-report', version: 1, startedAt: startedAt, durationMs: Math.round(now() - started),
      device: device(), renderer: gpu,
      frames: { count: frames, sampled: gaps.length, medianMs: percentile(gaps, 0.5), p95Ms: percentile(gaps, 0.95), p99Ms: percentile(gaps, 0.99), maxMs: Math.round(worstGap * 10) / 10, over50Ms: slowFrames },
      longTasks: { observed: !!observer, count: longTasks.count, totalMs: Math.round(longTasks.totalMs), maxMs: Math.round(longTasks.maxMs) },
      memoryMb: memory, screens: screens, statusEvents: statusEvents, previewRenders: renders,
      viewportFit: (root.cncViewportFit && root.cncViewportFit.stats) || null,
      note: 'Mesures navigateur sur l’appareil. Aucune commande machine. Rendu logiciel probable si renderer.software est vrai.'
    };
  }
  function refreshBadge() {
    if (!badge) return;
    var recent = gaps.length > 120 ? gaps.slice(-120) : gaps;
    var text = 'perf ' + (percentile(recent, 0.5) === null ? '—' : Math.round(percentile(recent, 0.5)) + ' ms') +
      ' · p95 ' + (percentile(recent, 0.95) === null ? '—' : Math.round(percentile(recent, 0.95))) +
      ' · LT ' + longTasks.count + ' · ' + (gpu.software === false ? 'GPU' : 'CPU');
    if (badge.textContent !== text) badge.textContent = text;
  }
  function exportReport() {
    try {
      var blob = new root.Blob([JSON.stringify(report(), null, 1)], { type: 'application/json;charset=utf-8' });
      root.CNCDownload.save(blob, 'cnc-touch-perf-' + startedAt.replace(/\D/g, '').slice(0, 14) + '.json');
      badge.textContent = uiLocale.t('Rapport exporté');
    } catch (_) { badge.textContent = uiLocale.t('Export impossible'); }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (frame !== null && root.cancelAnimationFrame) root.cancelAnimationFrame(frame);
    if (observer) observer.disconnect();
    if (ticker !== null) root.clearInterval(ticker);
  }
  if (typeof root.PerformanceObserver === 'function') {
    try {
      observer = new root.PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          longTasks.count++; longTasks.totalMs += entry.duration;
          if (entry.duration > longTasks.maxMs) longTasks.maxMs = entry.duration;
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (_) { observer = null; }
  }
  root.addEventListener('cnc-screen-change', function (event) {
    accountScreen(); activeScreen = String(event.detail || 'menu');
    var entry = screens[activeScreen] || (screens[activeScreen] = { visits: 0, ms: 0 }); entry.visits++;
  });
  root.addEventListener('cnc-job-status', function () { statusEvents++; });
  // A hidden page stops animation frames; the first gap after returning is not a stutter.
  doc.addEventListener('visibilitychange', function () { lastFrame = null; });
  root.addEventListener('pagehide', function (event) { if (!event || !event.persisted) dispose(); });
  wrapPreview();
  badge = doc.createElement('button'); badge.type = 'button'; badge.id = 'perf-harness';
  badge.setAttribute('aria-label', uiLocale.t('Mesure de performance : touchez pour exporter le rapport.'));
  badge.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483000;font:12px/1.2 monospace;color:#dfe;background:#000c;border:1px solid #4a6;border-radius:6px;padding:6px 8px;cursor:pointer;touch-action:manipulation';
  badge.textContent = 'perf —';
  badge.addEventListener('click', exportReport);
  doc.body.appendChild(badge);
  screens[activeScreen] = { visits: 1, ms: 0 };
  ticker = root.setInterval(function () { sampleMemory(); refreshBadge(); }, 1000);
  frame = root.requestAnimationFrame(tick);
  root.cncPerfHarness = { report: report, dispose: dispose };
})(window);
