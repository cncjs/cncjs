(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var screen = document.getElementById('screen-files');
  if (!screen) return;
  screen.innerHTML =
    uiLocale.html('<div class="card wide library-header"><div><h2>Bibliothèque partagée</h2>') +
    uiLocale.html('<p class="mute">Envoyez depuis le PC, retrouvez vos fichiers sur la Surface.</p></div>') +
    uiLocale.html('<button id="library-refresh" type="button">↻ Actualiser</button></div>') +
    uiLocale.html('<div class="card library-list-panel"><div class="library-list-title"><h2>Fichiers sur le serveur</h2><span id="library-count" class="tag">0</span></div>') +
    uiLocale.html('<label class="library-label" for="library-search">Rechercher un fichier</label>') +
    uiLocale.html('<input id="library-search" type="search" placeholder="Nom du fichier…">') +
    uiLocale.html('<p id="library-status" role="status">Connexion à la bibliothèque…</p>') +
    uiLocale.html('<div id="library-list" aria-label="Fichiers disponibles"></div>') +
    uiLocale.html('<div class="library-pages"><button id="library-prev" type="button" hidden>← Précédent</button><span id="library-page"></span><button id="library-more" type="button" hidden>Suivant →</button></div>') +
    uiLocale.html('<details id="library-upload"><summary>＋ Envoyer depuis ce PC</summary>') +
    uiLocale.html('<p>Le fichier et son image 2D seront enregistrés sur le serveur.</p>') +
    uiLocale.html('<label for="library-input">Fichier G-code — 20 Mo maximum</label>') +
    uiLocale.html('<input id="library-input" type="file" accept=".nc,.gcode,.tap,.ngc,.cnc,.txt">') +
    uiLocale.html('<button id="library-send" class="library-primary" type="button" disabled>Envoyer à la bibliothèque</button>') +
    uiLocale.html('<button id="library-cancel" type="button" hidden>Annuler la préparation</button>') +
    uiLocale.html('<p id="library-upload-status" role="status">Aucun fichier choisi.</p></details></div>') +
    uiLocale.html('<div class="card library-detail"><div class="library-eyebrow">FICHIER SÉLECTIONNÉ</div>') +
    uiLocale.html('<h2 id="library-name">Sélectionnez un fichier</h2>') +
    uiLocale.html('<p id="library-selection-state" class="library-selection-state"></p>') +
    uiLocale.html('<p id="library-meta" class="mute"></p>') +
    uiLocale.html('<div class="library-image-wrap"><img id="library-image" alt="Aperçu du parcours XY" hidden>') +
    uiLocale.html('<p id="library-image-status">L’aperçu 2D apparaîtra ici.</p></div>') +
    uiLocale.html('<p id="library-preview-note" class="mute"></p>') +
    uiLocale.html('<div id="library-dimensions-content" hidden><p id="library-dimensions-file"></p>') +
    uiLocale.html('<p id="library-dimensions-status" role="status">Sélectionnez un fichier dans la bibliothèque.</p>') +
    uiLocale.html('<table id="library-dimensions-table" class="ks-dimensions-table" hidden><thead><tr><th scope="col">Axe</th><th scope="col">Minimum</th><th scope="col">Maximum</th><th scope="col">Étendue</th></tr></thead>') +
    uiLocale.html('<tbody><tr><th scope="row">X</th><td id="library-dimensions-xmin"></td><td id="library-dimensions-xmax"></td><td id="library-dimensions-width"></td></tr>') +
    uiLocale.html('<tr><th scope="row">Y</th><td id="library-dimensions-ymin"></td><td id="library-dimensions-ymax"></td><td id="library-dimensions-height"></td></tr></tbody></table>') +
    uiLocale.html('<p>Trajets rapides G0 inclus. Départ supposé X0 Y0. Projection XY approximative : ce ne sont pas les dimensions de la pièce. Z non représenté.</p></div>') +
    uiLocale.html('<button id="library-regenerate" type="button" disabled>Régénérer l’aperçu depuis ce PC</button>') +
    uiLocale.html('<p id="library-regenerate-status" role="status"></p>') +
    uiLocale.html('<div class="library-execution"><strong>Stocké pour plus tard</strong>') +
    uiLocale.html('<p>L’envoi et la sélection ne démarrent pas la machine.</p>') +
    uiLocale.html('<button type="button" disabled>Exécution — prochaine étape</button></div></div>');

  var $ = function (id) { return document.getElementById(id); };
  var files = [], selected = '', detailVersion = '', requestId = 0;
  var refreshing = false, busy = false, generation = 0, reader = null, pageSize = 4, page = 0;
  var mounted = false, refreshId = 0, refreshAgain = 0, refreshPromise = null, requests = {}, rows = Object.create(null), listKey = '', deferredText = {}, detailLoading = false;
  var regenerating = false, regenerationId = 0;
  var machine = null, fileStateKey = '', listState = 'loading', listSignature = '';
  var suffix = '.cnctouch.json';
  function visible() { return !document.hidden && screen.classList.contains('active'); }
  function setText(id, value) {
    value = String(value);
    if (!visible()) { deferredText[id] = value; return; }
    var el = $(id); if (el.textContent !== value) el.textContent = value;
  }
  function property(el, key, value) { if (el[key] !== value) el[key] = value; }
  function attribute(el, key, value) { if (el.getAttribute(key) !== value) el.setAttribute(key, value); }
  function cancelRequest(kind) {
    var xhr = requests[kind]; delete requests[kind];
    if (xhr && typeof xhr.abort === 'function') xhr.abort();
  }
  function cancelRegeneration() {
    regenerationId++; regenerating = false;
    cancelRequest('regenerate');
  }
  function previewChanged(file) { window.dispatchEvent(new CustomEvent('cnc-library-preview-updated', { detail: { file: file } })); }
  function publishSelection(file, name) {
    var previous = window.cncLibrarySelection;
    if (previous && previous.file === file && previous.name === name || !previous && !file) return;
    window.cncLibrarySelection = file ? { file: file, name: name } : null;
    window.dispatchEvent(new CustomEvent('cnc-library-select', { detail: window.cncLibrarySelection }));
  }
  function auth() {
    try { var d = JSON.parse(localStorage.getItem('cnc') || '{}'); return d.state.session.token || ''; }
    catch (_) { return ''; }
  }
  var pendingUpload = '', pendingUntil = 0;
  function request(method, path, body, kind, cancelled, responseBlob) {
    return new Promise(function (resolve, reject) {
      if (cancelled && cancelled()) { reject(new Error(uiLocale.t('Lecture annulée.'))); return; }
      var token = auth();
      if (!token) { reject(new Error(uiLocale.t('Ouvrez CNCjs à la racine du serveur pour établir la session, puis rechargez cette page.'))); return; }
      var xhr = new XMLHttpRequest();
      if (kind) requests[kind] = xhr;
      function done() { if (kind && requests[kind] === xhr) delete requests[kind]; }
      xhr.open(method, '/api/watch/' + path, true);
      if (responseBlob) {
        try {
          xhr.responseType = 'blob';
          if (xhr.responseType !== 'blob') throw new Error('Blob indisponible');
        } catch (_) { done(); reject(new Error(uiLocale.t('Lecture binaire indisponible : utilisez un navigateur compatible pour régénérer l’aperçu.'))); return; }
      }
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.timeout = 120000;
      if (body) xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        done();
        // A completed obsolete read must not parse a potentially large G-code response.
        if (cancelled && cancelled()) { reject(new Error(uiLocale.t('Lecture annulée.'))); return; }
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(xhr.status === 401 || xhr.status === 403 ? uiLocale.t('Session expirée : ouvrez CNCjs et reconnectez-vous.') : uiLocale.t('Le serveur a refusé la demande (HTTP ') + xhr.status + ').')); return;
        }
        if (responseBlob) { resolve(xhr.response); return; }
        try { resolve(JSON.parse(xhr.responseText)); } catch (_) { reject(new Error(uiLocale.t('Réponse du serveur illisible.'))); }
      };
      xhr.onerror = function () { done(); reject(new Error(uiLocale.t('Serveur inaccessible. Vérifiez la connexion réseau.'))); };
      xhr.ontimeout = function () { done(); reject(new Error(uiLocale.t('Le serveur ne répond pas. Actualisez la liste avant de réessayer.'))); };
      xhr.onabort = function () { done(); reject(new Error(uiLocale.t('Lecture annulée.'))); };
      xhr.send(body ? (typeof Blob !== 'undefined' && body instanceof Blob ? body : JSON.stringify(body)) : null);
    });
  }
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + uiLocale.t(' Mo') : Math.max(1, Math.ceil(n / 1024)) + uiLocale.t(' Ko'); }
  function displayName(name) { return name.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/, ''); }
  function dimensions(bounds, message) {
    var fields = ['xmin', 'ymin', 'xmax', 'ymax', 'width', 'height'];
    var valid = Array.isArray(bounds) && bounds.length === 4 && bounds.every(function (n) { return typeof n === 'number' && isFinite(n); }) &&
      bounds[2] >= bounds[0] && bounds[3] >= bounds[1] && isFinite(bounds[2] - bounds[0]) && isFinite(bounds[3] - bounds[1]);
    property($('library-dimensions-table'), 'hidden', !valid);
    setText('library-dimensions-status', valid ? uiLocale.t('D’après l’aperçu enregistré · en millimètres') : message || uiLocale.t('Dimensions indisponibles. Régénérez l’aperçu depuis le PC via « Détails de l’aperçu ».'));
    var values = valid ? bounds.concat([bounds[2] - bounds[0], bounds[3] - bounds[1]]) : [];
    fields.forEach(function (field, i) {
      var value = values[i];
      setText('library-dimensions-' + field, valid ? (Math.abs(value) < 0.005 ? 0 : value).toLocaleString(window.cncI18n?window.cncI18n.locale:'fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
    });
  }
  // Row thumbnails and XY extents come from each file's stored preview, read one
  // at a time in idle time after the list is drawn (never before the selected
  // file's own detail), and cached per file version. Without requestIdleCallback
  // (tests, very old browsers) rows simply show no thumbnail.
  var thumbs = Object.create(null), thumbBusy = false, thumbIdle = null;
  function thumbKey(f) { return f.name + ':' + (f.previewMtime || ''); }
  function rowInfo(f, bounds) {
    var valid = Array.isArray(bounds) && bounds.length === 4 && bounds.every(function (n) { return typeof n === 'number' && isFinite(n); }) && bounds[2] >= bounds[0] && bounds[3] >= bounds[1];
    var extent = valid ? Math.round(bounds[2] - bounds[0]) + ' × ' + Math.round(bounds[3] - bounds[1]) + ' mm · ' : '';
    return extent + size(f.size) + ' · ' + new Date(f.mtime).toLocaleString(window.cncI18n ? window.cncI18n.locale : 'fr-FR');
  }
  function scheduleThumbs() {
    if (typeof requestIdleCallback !== 'function' || thumbIdle !== null) return;
    // Only in a real idle period (parsing a stored preview can take a few hundred ms on
    // the tablet): never with a timeout, so a screen opening is never delayed by it.
    // A short idle period is retried half a second later (never in a loop of idle callbacks),
    // and nothing is retried once Fichiers is left: mount() schedules again.
    thumbIdle = requestIdleCallback(function (deadline) {
      thumbIdle = null;
      if (!visible()) return;
      if (deadline && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 45) {
        thumbIdle = setTimeout(function () { thumbIdle = null; scheduleThumbs(); }, 500); return;
      }
      nextThumb();
    });
  }
  function nextThumb() {
    if (thumbBusy || !visible() || detailLoading) { if (detailLoading) scheduleThumbs(); return; }
    var row = null, names = Object.keys(rows);
    for (var i = 0; i < names.length && !row; i++) { var candidate = rows[names[i]], f = candidate._file; if (f && f.previewMtime && !thumbs[thumbKey(f)]) row = candidate; }
    if (!row) return;
    var file = row._file, key = thumbKey(file);
    if (Object.keys(thumbs).length > 40) thumbs = Object.create(null);
    thumbBusy = true;
    request('POST', 'file', { file: file.name + suffix }, 'thumb').then(function (response) {
      var meta = JSON.parse(response.data), p = meta && meta.file === file.name && meta.preview || {};
      var image = typeof p.image === 'string' && p.image.length <= 2500000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.image) ? p.image : '';
      var bounds = Array.isArray(p.bounds) ? p.bounds : null;
      // The stored preview is 960 × 540: a 192 × 108 copy is kept for the row, so the
      // list never decodes five full previews when it is shown again.
      return downscale(image).then(function (small) { thumbs[key] = { image: small, bounds: bounds }; });
    }).catch(function () { thumbs[key] = { image: '', bounds: null }; }).then(function () { thumbBusy = false; applyThumbs(); scheduleThumbs(); });
  }
  function downscale(image) {
    return new Promise(function (resolve) {
      if (!image || typeof Image !== 'function') { resolve(''); return; }
      var im = new Image();
      im.onload = function () { try { var c = document.createElement('canvas'); c.width = 192; c.height = 108; c.getContext('2d').drawImage(im, 0, 0, 192, 108); resolve(c.toDataURL('image/png')); } catch (_) { resolve(''); } };
      im.onerror = function () { resolve(''); };
      im.src = image;
    });
  }
  function applyThumbs() {
    if (!visible()) return;
    Object.keys(rows).forEach(function (name) {
      var row = rows[name], f = row._file, t = f && thumbs[thumbKey(f)];
      if (!t || !row._img) return;
      if (t.image) { if (row._img.getAttribute('src') !== t.image) row._img.setAttribute('src', t.image); property(row._img, 'hidden', false); }
      else property(row._img, 'hidden', true);
      property(row._info, 'textContent', rowInfo(f, t.bounds));
    });
  }
  function selectedRow() {
    if (!visible()) return;
    Object.keys(rows).forEach(function (key) {
      var label = fileState(key);
      attribute(rows[key], 'aria-pressed', key === selected ? 'true' : 'false');
      property(rows[key]._state, 'textContent', label);
      property(rows[key]._state, 'hidden', !label);
    });
    setText('library-selection-state', selected ? fileState(selected) + (!machine || !machine.fresh ? uiLocale.t(' · État chargé indisponible') : '') : '');
  }
  function fileState(name) {
    var labels = name === selected ? [uiLocale.t('✓ Sélectionné')] : [];
    if (machine && machine.fresh && machine.name === name) {
      labels.push(/^Alarm/.test(machine.activeState || '') ? uiLocale.t('! Alarme · chargé') :
        machine.workflow === 'paused' || /^Hold/.test(machine.activeState || '') ? uiLocale.t('Ⅱ En pause') :
        machine.workflow === 'running' || /^Run/.test(machine.activeState || '') ? uiLocale.t('▶ En cours') : uiLocale.t('● Chargé'));
    }
    return labels.join(' · ');
  }
  function renderList() {
    if (!visible()) return;
    var query = $('library-search').value.toLowerCase();
    var matches = files.filter(function (f) { return displayName(f.name).toLowerCase().indexOf(query) >= 0; });
    page=Math.min(page,Math.max(0,Math.ceil(matches.length/pageSize)-1));
    var shown = matches.slice(page*pageSize, (page+1)*pageSize);
    var key = JSON.stringify([shown, files.length, matches.length, query, page, pageSize, selected, listState]);
    if (key === listKey) { selectedRow(); return; } listKey = key;
    var list = $('library-list'), desired = [], keep = Object.create(null), focused = document.activeElement;
    setText('library-count', files.length);
    shown.forEach(function (f) {
      var button = rows[f.name];
      if (!button) {
        button = document.createElement('button'); button.type = 'button'; button.className = 'library-file'; button.setAttribute('data-file', f.name);
        // Thumbnail (the stored preview, loaded in idle time), name, then size and date.
        button._thumb = document.createElement('span'); button._thumb.className = 'library-thumb';
        button._img = document.createElement('img'); button._img.alt = ''; button._img.hidden = true; button._thumb.appendChild(button._img);
        button._name = document.createElement('strong'); button._info = document.createElement('span');
        button._state = document.createElement('span'); button._state.className = 'library-file-state';
        var text = document.createElement('div'); text.className = 'library-row-text';
        var meta = document.createElement('div'); meta.className = 'library-row-meta';
        meta.appendChild(button._info); text.appendChild(button._name); text.appendChild(meta);
        button.appendChild(button._thumb); button.appendChild(text); button.appendChild(button._state);
        button.addEventListener('click', function () { select(button._file, false); });
        rows[f.name] = button;
      }
      button._file = f;
      property(button._name, 'textContent', displayName(f.name));
      var known = thumbs[thumbKey(f)];
      property(button._info, 'textContent', rowInfo(f, known && known.bounds));
      desired.push(button); keep[f.name] = true;
    });
    applyThumbs(); scheduleThumbs();
    if (!desired.length) {
      var empty = list._empty || (list._empty = document.createElement('p'));
      property(empty, 'textContent', files.length ? uiLocale.t('Aucun résultat.') : listState === 'loading' ? uiLocale.t('Chargement de la liste…') :
        listState === 'error' ? uiLocale.t('Liste indisponible. Utilisez Actualiser pour réessayer.') : uiLocale.t('La bibliothèque est vide. Envoyez un premier fichier depuis le PC.')); desired.push(empty);
    }
    desired.forEach(function (node, i) { if (list.children[i] !== node) list.insertBefore(node, list.children[i] || null); });
    while (list.children.length > desired.length) list.removeChild(list.lastChild);
    if (focused && list.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
    Object.keys(rows).forEach(function (name) { if (!keep[name]) delete rows[name]; });
    property($('library-more'), 'hidden', (page+1)*pageSize >= matches.length);
    property($('library-prev'), 'hidden', page === 0);
    setText('library-page', matches.length?uiLocale.t('Page ')+(page+1)+' / '+Math.ceil(matches.length/pageSize):'');
    selectedRow();
  }
  function select(f, force) {
    var version = f.name + ':' + f.mtime + ':' + f.size + ':' + (f.previewMtime || '');
    if (!force && version === detailVersion) return;
    var changedPreview = selected === f.name && !!detailVersion && (force || version !== detailVersion);
    cancelRequest('detail');
    if (selected !== f.name) { cancelRegeneration(); setText('library-regenerate-status', ''); }
    selected = f.name; detailVersion = version; detailLoading = true; var id = ++requestId;
    var previous = window.cncLibrarySelection;
    publishSelection(f.name, previous && previous.file === f.name ? previous.name : displayName(f.name));
    if (changedPreview) previewChanged(f.name);
    $('library-regenerate').disabled = false;
    selectedRow();
    $('library-name').textContent = displayName(f.name);
    $('library-dimensions-file').textContent = displayName(f.name);
    dimensions(null, uiLocale.t('Chargement des dimensions enregistrées…'));
    $('library-meta').textContent = size(f.size) + ' · ' + new Date(f.mtime).toLocaleString(window.cncI18n?window.cncI18n.locale:'fr-FR');
    $('library-image').hidden = true; $('library-image').removeAttribute('src');
    $('library-image-status').hidden = false; $('library-image-status').textContent = uiLocale.t('Chargement de l’image…');
    $('library-preview-note').textContent = '';
    request('POST', 'file', { file: f.name + suffix }, 'detail').then(function (response) {
      if (id !== requestId) return;
      var meta = JSON.parse(response.data);
      if (meta.version !== 1 || meta.file !== f.name || typeof meta.originalName !== 'string') throw new Error(uiLocale.t('Métadonnées non reconnues'));
      publishSelection(f.name, meta.originalName);
      $('library-name').textContent = meta.originalName;
      $('library-dimensions-file').textContent = meta.originalName;
      dimensions(meta.preview && meta.preview.bounds);
      var image = meta.preview && meta.preview.image;
      if (typeof image === 'string' && image.length <= 2500000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)) {
        $('library-image').onload = function () {
          if (id !== requestId) return;
          detailLoading = false;
          $('library-image').hidden = false; $('library-image-status').hidden = true;
        };
        $('library-image').onerror = function () {
          if (id !== requestId) return;
          detailLoading = false;
          $('library-image').hidden = true; $('library-image-status').hidden = false;
          $('library-image-status').textContent = uiLocale.t('Image illisible. Le G-code reste enregistré.');
        };
        $('library-image').src = image;
        $('library-preview-note').textContent = String(meta.preview.note || '') + ' · ' + Number(meta.preview.segments || 0).toLocaleString(window.cncI18n?window.cncI18n.locale:'fr-FR') + ' segments.';
      } else { detailLoading = false; $('library-image-status').textContent = uiLocale.t('Aperçu indisponible : ') + String(meta.previewError || uiLocale.t('aucune image enregistrée')) + uiLocale.t('. Le G-code reste disponible.'); }
    }).catch(function () {
      if (id !== requestId) return;
      detailLoading = false;
      detailVersion = ''; // Retry a sidecar still being uploaded at the next refresh.
      dimensions(null);
      $('library-image-status').textContent = uiLocale.t('Aucune image disponible pour ce fichier. Envoyez-le depuis cette interface pour créer son aperçu.');
    });
  }
  function refresh(manual) {
    if (!visible()) { refreshAgain = Math.max(refreshAgain, manual ? 2 : 1); return Promise.resolve(); }
    if (refreshing) { refreshAgain = Math.max(refreshAgain, manual ? 2 : 1); return refreshPromise; }
    // Re-opening Fichiers checks a list already shown without touching the screen: the
    // status and the rows are only written again when the answer differs (each write
    // makes the tablet lay the whole screen out again).
    var quiet = !manual && listState === 'ready';
    refreshing = true;
    if (!quiet) { listState = 'loading'; renderList(); setText('library-status', uiLocale.t('Actualisation de la bibliothèque…')); }
    var id = ++refreshId;
    refreshPromise = request('GET', 'status', null, 'list').then(function (status) {
      if (id !== refreshId) return null;
      if (!status.configured) throw new Error(uiLocale.t('Le dossier partagé CNCjs n’est pas encore configuré.'));
      return request('POST', 'files', { path: '' }, 'list');
    }).then(function (response) {
      if (id !== refreshId || !response) return;
      var all = response.files || [];
      files = all.filter(function (f) { return f.type === 'f' && /\.(nc|gcode|tap|ngc|cnc|txt)$/i.test(f.name); });
      var previews = {};
      all.forEach(function (f) { if (f.name.slice(-suffix.length) === suffix) previews[f.name.slice(0, -suffix.length)] = f.mtime; });
      files.forEach(function (f) { f.previewMtime = previews[f.name] || ''; });
      files.sort(function (a, b) { return new Date(b.mtime) - new Date(a.mtime) || a.name.localeCompare(b.name); });
      var signature = JSON.stringify(files), unchanged = quiet && signature === listSignature; listSignature = signature;
      listState = 'ready'; renderList();
      if (!unchanged) setText('library-status', uiLocale.t('À jour · ') + new Date().toLocaleTimeString(window.cncI18n?window.cncI18n.locale:'fr-FR', { hour: '2-digit', minute: '2-digit' }));
      var f = files.filter(function (item) { return item.name === selected; })[0];
      // A file just uploaded appears in CNCjs's list a few seconds later: keep it
      // selected meanwhile instead of falling back to another file.
      if (f && f.name === pendingUpload) pendingUpload = '';
      var waited = !f && selected && selected === pendingUpload;
      if (waited && Date.now() < pendingUntil) return;
      // Still not listed after that: clear the selection rather than silently
      // selecting another file, which could then be loaded by mistake.
      if (waited) pendingUpload = '';
      // Only an empty selection defaults to the newest file: a selected file that disappeared
      // (deleted, renamed) clears the selection too.
      f = f || (waited || selected ? null : files[0]);
      if (f) select(f, !!manual);
      else {
        if (selected) { cancelRegeneration(); setText('library-regenerate-status', ''); }
        selected = ''; detailVersion = ''; detailLoading = false; requestId++;
        selectedRow();
        cancelRequest('detail');
        publishSelection(null);
        $('library-regenerate').disabled = true;
        $('library-name').textContent = uiLocale.t('Sélectionnez un fichier'); $('library-meta').textContent = '';
        $('library-dimensions-file').textContent = '';
        dimensions(null, uiLocale.t('Sélectionnez un fichier dans la bibliothèque.'));
        $('library-image').hidden = true; $('library-image-status').hidden = false;
        $('library-image-status').textContent = uiLocale.t('L’aperçu 2D apparaîtra ici.'); $('library-preview-note').textContent = '';
      }
    }).catch(function (error) { if (id === refreshId) { listState = 'error'; renderList(); setText('library-status', error.message); } }).then(function () {
      if (id !== refreshId) return;
      refreshing = false; refreshPromise = null;
      var again = refreshAgain; refreshAgain = 0;
      if (again) return refresh(again === 2);
    });
    return refreshPromise;
  }
  function lock(value) {
    busy = value; property($('library-input'), 'disabled', value);
    property($('library-send'), 'disabled', value || !$('library-input').files.length);
    property($('library-cancel'), 'hidden', !value);
  }
  function safeName(name) {
    var extension = (name.match(/\.[^.]+$/) || ['.nc'])[0].toLowerCase();
    var base = name.slice(0, -extension.length).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 90) || 'fichier';
    var bytes = new Uint8Array(8), random = '';
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < bytes.length; j++) random += ('0' + bytes[j].toString(16)).slice(-2);
    return base + '--touch-' + new Date().toISOString().replace(/\D/g, '').slice(0, 14) + '-' + random + extension;
  }
  function readAs(file, encoding) {
    return new Promise(function (resolve, reject) {
      reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error(uiLocale.t('Lecture du fichier impossible.'))); };
      reader.onabort = function () { reject(new Error(uiLocale.t('Annulé'))); };
      if (encoding) reader.readAsText(file, encoding); else reader.readAsText(file);
    });
  }
  // Read as UTF-8; a file that is not valid UTF-8 (U+FFFD replacements, typically
  // an older CAM writing Latin-1 comments) is read again as Windows-1252.
  // Resolves with { text, legacy }.
  function read(file) {
    if (typeof file.text === 'string') return Promise.resolve({ text: file.text, legacy: false }); // generated in the page (commissioning test file)
    return readAs(file).then(function (text) {
      if (text.indexOf('�') < 0) return { text: text, legacy: false };
      return readAs(file, 'windows-1252').then(function (legacy) {
        // EF BF BD read as Windows-1252: the file was valid UTF-8 holding a real U+FFFD.
        return legacy.indexOf('ï¿½') >= 0 ? { text: text, legacy: false } : { text: legacy, legacy: true };
      });
    });
  }
  $('library-input').addEventListener('change', function () {
    var f = this.files[0]; $('library-send').disabled = !f;
    $('library-upload-status').textContent = f ? f.name + ' · ' + size(f.size) : uiLocale.t('Aucun fichier choisi.');
  });
  $('library-cancel').addEventListener('click', function () {
    generation++;
    if (reader && reader.readyState === 1) reader.abort();
    lock(false); $('library-upload-status').textContent = uiLocale.t('Préparation annulée. Aucun fichier envoyé.');
  });
  // Stores a G-code and its 2D preview in the library; resolves with the stored name.
  function send(file) {
    if (!file || busy) return Promise.reject(new Error(uiLocale.t('Un envoi est déjà en cours.')));
    if (!/\.(nc|gcode|tap|ngc|cnc|txt)$/i.test(file.name) || !file.size || file.size > 20 * 1048576) {
      $('library-upload-status').textContent = uiLocale.t('Choisissez un G-code non vide de 20 Mo maximum.'); return Promise.reject(new Error($('library-upload-status').textContent));
    }
    var current = ++generation, text = '', stored = safeName(file.name), wrote = false, legacy = false;
    var meta = { version: 1, file: stored, originalName: file.name, bytes: file.size, createdAt: new Date().toISOString() };
    function cancelled() { return current !== generation; }
    function status(s) { if (!cancelled()) setText('library-upload-status', s); }
    lock(true); status(uiLocale.t('Lecture du fichier…'));
    return read(file).then(function (data) {
      if (cancelled()) throw new Error(uiLocale.t('Annulé'));
      text = data.text; legacy = data.legacy;
      if (/\x00/.test(text)) throw new Error(uiLocale.t('Ce fichier semble binaire. Un G-code texte est attendu.'));
      return window.CNCLibraryPreview.render(text, document.createElement('canvas'), cancelled, status).then(function (preview) {
        if (preview.image.length > 2500000) meta.previewError = uiLocale.t('image trop volumineuse'); else meta.preview = preview;
      }).catch(function (error) { if (cancelled()) throw error; meta.previewError = error.message; });
    }).then(function () {
      if (cancelled()) throw new Error(uiLocale.t('Annulé'));
      var payload = window.CNCLibraryPayload;
      return payload ? payload.encodeFile(stored, text, cancelled, status) : { file: stored, data: text };
    }).then(function (payload) {
      if (cancelled()) throw new Error(uiLocale.t('Annulé'));
      $('library-cancel').hidden = true; // Once the server write starts, report its actual outcome.
      status(uiLocale.t('Envoi du G-code au serveur…'));
      text = '';
      return request('PUT', 'file', payload);
    }).then(function () {
      wrote = true; text = ''; status(uiLocale.t('Enregistrement de l’image 2D…'));
      return request('PUT', 'file', { file: stored + suffix, data: JSON.stringify(meta) });
    }).then(function () {
      if (selected !== stored) { cancelRegeneration(); setText('library-regenerate-status', ''); }
      selected = stored; pendingUpload = stored; pendingUntil = Date.now() + 15000; detailVersion = ''; $('library-input').value = ''; lock(false);
      publishSelection(stored, file.name);
      // Until CNCjs lists the new file (about 4 s), the card shows it from what was just
      // written: the file named here is the one that "Charger" loads.
      cancelRequest('detail'); requestId++; detailLoading = false; selectedRow();
      $('library-name').textContent = file.name; $('library-dimensions-file').textContent = file.name;
      $('library-meta').textContent = size(file.size) + ' · ' + new Date().toLocaleString(window.cncI18n?window.cncI18n.locale:'fr-FR');
      dimensions(meta.preview && meta.preview.bounds);
      var uploadedImage = meta.preview && meta.preview.image;
      $('library-image').onload = $('library-image').onerror = null;
      if (typeof uploadedImage === 'string' && uploadedImage) { $('library-image').src = uploadedImage; $('library-image').hidden = false; $('library-image-status').hidden = true; }
      else { $('library-image').hidden = true; $('library-image').removeAttribute('src'); $('library-image-status').hidden = false;
        $('library-image-status').textContent = uiLocale.t('Aperçu indisponible : ') + String(meta.previewError || uiLocale.t('aucune image enregistrée')) + uiLocale.t('. Le G-code reste disponible.'); }
      status('✓ ' + file.name + uiLocale.t(' enregistré. Disponible sur la Surface.') + (legacy ? uiLocale.t(' Fichier non UTF-8 : lu en Windows-1252 (accents convertis).') : '') + (meta.previewError ? uiLocale.t(' Aperçu indisponible : ') + meta.previewError : ''));
      previewChanged(stored);
      // CNCjs's watch list sees a new file a few seconds after it is written
      // (measured: about 4 s on the tablet): look again a few times.
      [2000, 5000, 9000].forEach(function (delay) { setTimeout(function () { refresh(true); }, delay); });
      refresh(true);
      return stored;
    }).catch(function (error) {
      if (cancelled()) throw error;
      lock(false); status((wrote ? uiLocale.t('G-code enregistré, mais image non enregistrée. ') : uiLocale.t('Envoi non confirmé. ')) + error.message);
      refresh(true);
      throw error;
    });
  }
  $('library-send').addEventListener('click', function () { send($('library-input').files[0]).catch(function () {}); });
  // Adds a G-code generated in the page (commissioning air-cut test) to the library.
  window.cncLibraryImport = function (name, text) { return send({ name: name, size: text.length, text: String(text) }); };
  $('library-refresh').addEventListener('click', function () { refresh(true); });
  $('library-regenerate').addEventListener('click', function () {
    if (regenerating || !selected) return;
    var file = files.filter(function (f) { return f.name === selected; })[0];
    if (!file || file.size > 20 * 1048576) return;
    regenerating = true;
    var name = file.name, meta, current = ++regenerationId;
    function cancelled() { return current !== regenerationId || selected !== name; }
    function check() { if (cancelled()) throw new Error(uiLocale.t('Sélection modifiée : régénération annulée.')); }
    function status(value) { if (!cancelled()) setText('library-regenerate-status', value); }
    status(uiLocale.t('Lecture du fichier enregistré…'));
    request('POST', 'file', {file: name + suffix}, 'regenerate', cancelled).then(function (result) {
      check();
      try {meta = JSON.parse(result.data);} catch (_) {}
    }).catch(function (error) { if (cancelled()) throw error; }).then(function () {
      check();
      if (!meta || meta.file !== name) meta = {version:1, file:name, originalName:displayName(name), bytes:file.size};
      return request('POST', 'file', {file:name}, 'regenerate', cancelled, true);
    }).then(function (response) {
      check();
      return window.CNCLibraryPreview.renderResponse(response, document.createElement('canvas'), cancelled, status);
    }).then(function (preview) {
      check();
      if (preview.image.length > 2500000) throw new Error(uiLocale.t('Image trop volumineuse.'));
      meta.preview = preview; delete meta.previewError; meta.previewVersion = 2;
      return request('POST', 'files', {path:''}, 'regenerate', cancelled);
    }).then(function (result) {
      check();
      var current = result.files.filter(function (f) {return f.name === name;})[0];
      if (!current || current.mtime !== file.mtime || current.size !== file.size || cancelled()) throw new Error(uiLocale.t('Fichier ou sélection modifiés : relancez la régénération.'));
      // Once transmitted, this write is allowed to finish even if selection changes.
      return request('PUT', 'file', {file:name+suffix, data:JSON.stringify(meta)});
    }).then(function () {
      if (selected === name) detailVersion = '';
      status(uiLocale.t('✓ Aperçu mis à jour sur le serveur, visible aussi sur la Surface.'));
      previewChanged(name);
      return refresh(false);
    }).catch(function (error) { status(uiLocale.t('Aperçu non modifié : ') + error.message); }).then(function () { if (current === regenerationId) regenerating = false; });
  });
  $('library-search').addEventListener('input', function () { page = 0; renderList(); });
  $('library-more').addEventListener('click', function () { page++; renderList(); });
  $('library-prev').addEventListener('click', function () { page=Math.max(0,page-1); renderList(); });
  window.addEventListener('cnc-job-status', function (event) {
    machine = event.detail && event.detail.machine || null;
    var key = JSON.stringify(machine ? [machine.name, !!machine.fresh, machine.workflow, machine.activeState] : null);
    if (key !== fileStateKey) { fileStateKey = key; selectedRow(); }
  });
  window.addEventListener('cnc-library-page-size',function(e){
    var size=Number(e.detail);
    if(size!==2&&size!==4&&size!==5)return;
    if(size!==pageSize){page=Math.floor(page*pageSize/size);pageSize=size;renderList();}
  });
  function mount() {
    if (mounted || !visible()) return;
    mounted = true;
    Object.keys(deferredText).forEach(function (id) { setText(id, deferredText[id]); }); deferredText = {};
    renderList(); applyThumbs(); scheduleThumbs();
    var manual = refreshAgain === 2; refreshAgain = 0;
    refresh(manual);
  }
  function unmount() {
    if (!mounted) return;
    mounted = false; refreshId++; requestId++;
    if (detailLoading) detailVersion = '';
    detailLoading = false; $('library-image').onload = null; $('library-image').onerror = null;
    cancelRequest('list'); cancelRequest('detail'); cancelRequest('thumb'); thumbBusy = false;
    refreshing = false; refreshPromise = null;
  }
  window.addEventListener('cnc-screen-change', function (e) { if (e.detail === 'files') mount(); else unmount(); });
  document.addEventListener('visibilitychange', function () { if (visible()) mount(); else unmount(); });
  window.cncLibraryView = { mount: mount, unmount: unmount };
  mount();
})();
