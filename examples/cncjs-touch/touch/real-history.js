(function () {
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  if (document.body.getAttribute('data-simulation') === 'true') return;
  var journal = window.cncSessionJournal.create(), page = 0, size = 5, dirty = true;
  var $ = function (id) { return document.getElementById(id); };
  var rows = Object.create(null), mounted = false;
  function set(el, key, value) { if (el[key] !== value) el[key] = value; }
  function render() {
    if (!mounted || document.hidden || !$('screen-history').classList.contains('active') || !dirty) return;
    dirty = false;
    var events = journal.report().events, list = $('real-history-list');
    page = Math.min(page, Math.max(0, Math.ceil(events.length / size) - 1));
    var desired = [], keep = Object.create(null);
    events.slice(page * size, (page + 1) * size).forEach(function (e) {
      var row = rows[e.id];
      if (!row) {
        row = document.createElement('li'); row._title = document.createElement('strong'); row._detail = document.createElement('p');
        row.appendChild(row._title); row.appendChild(row._detail); rows[e.id] = row;
      }
      set(row._title, 'textContent', new Date(e.time).toLocaleTimeString(window.cncI18n?window.cncI18n.locale:'fr-FR') + ' — ' + e.message);
      set(row._detail, 'textContent', (e.port || '') + (e.file ? ' · ' + e.file : ''));
      set(row._detail, 'hidden', !row._detail.textContent); desired.push(row); keep[e.id] = true;
    });
    if (!events.length) { var empty = list._empty || (list._empty = document.createElement('li')); set(empty, 'textContent', uiLocale.t('Aucun événement pour le moment.')); desired.push(empty); }
    desired.forEach(function (row, i) { if (list.children[i] !== row) list.insertBefore(row, list.children[i] || null); });
    while (list.children.length > desired.length) list.removeChild(list.lastChild);
    Object.keys(rows).forEach(function (id) { if (!keep[id]) delete rows[id]; });
    set($('real-history-page'), 'textContent', uiLocale.t('Page ') + (page + 1) + ' / ' + Math.max(1,Math.ceil(events.length / size)) + ' · ' + events.length + uiLocale.t(' événements'));
    set($('real-history-prev'), 'disabled', page === 0);
    set($('real-history-next'), 'disabled', (page + 1) * size >= events.length);
  }
  function changed(value) { if (value) { dirty = true; page = 0; render(); } }
  $('real-history-prev').addEventListener('click', function () { page = Math.max(0, page - 1); dirty = true; render(); });
  $('real-history-next').addEventListener('click', function () { page++; dirty = true; render(); });
  function mount() { if (document.hidden || !$('screen-history').classList.contains('active')) return; mounted = true; render(); }
  function unmount() { mounted = false; }
  window.addEventListener('cnc-screen-change', function (e) { if (e.detail === 'history') mount(); else unmount(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) unmount(); else mount(); });
  window.cncRealHistoryView = { mount: mount, unmount: unmount };
  window.addEventListener('cnc-history-page-size', function (e) {
    var next = Number(e.detail); if ((next !== 3 && next !== 5) || next === size) return;
    page = Math.floor(page * size / next); size = next; dirty = true; render();
  });
  window.addEventListener('cnc-job-status', function (e) {
    if (!e.detail.simulation) {
      if(window.cncState&&window.CNCJobStream)changed(journal.connection(window.cncState.get().transportConnected));
      changed(journal.observe(e.detail.machine));
    }
  });
  if (window.cncSocket&&!(window.cncState&&window.CNCJobStream)) {
    var socket = window.cncSocket;
    socket.on('connect', function () { changed(journal.connection(true)); });
    ['disconnect', 'connect_error', 'error'].forEach(function (event) {
      socket.on(event, function () { changed(journal.connection(false)); });
    });
    if (socket.connected) changed(journal.connection(true));
  }
  function download(format) {
    try {
      var report = journal.report();
      var blob = new Blob([format === 'json' ? JSON.stringify(report, null, 2) : window.cncSessionJournal.text(report)],
        { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' });
      var name = 'cnc-journal-' + report.exportedAt.replace(/[:.]/g, '-') + '.' + format;
      window.CNCDownload.save(blob,name);
      $('real-export-status').textContent = uiLocale.t('Téléchargement demandé : ') + name;
    } catch (e) { $('real-export-status').textContent = uiLocale.t('Téléchargement indisponible dans ce navigateur.'); }
  }
  $('real-export-text').addEventListener('click', function () { download('txt'); });
  $('real-export-json').addEventListener('click', function () { download('json'); });
  mount();
})();
