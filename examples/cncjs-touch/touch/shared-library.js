(function () {
  'use strict';
  var screen = document.getElementById('screen-files');
  if (!screen) return;
  screen.innerHTML =
    '<div class="card wide library-header"><div><h2>Bibliothèque partagée</h2>' +
    '<p class="mute">Envoyez depuis le PC, retrouvez vos fichiers sur la Surface.</p></div>' +
    '<button id="library-refresh" type="button">↻ Actualiser</button></div>' +
    '<div class="card library-list-panel"><div class="library-list-title"><h2>Fichiers sur le serveur</h2><span id="library-count" class="tag">0</span></div>' +
    '<label class="library-label" for="library-search">Rechercher un fichier</label>' +
    '<input id="library-search" type="search" placeholder="Nom du fichier…">' +
    '<p id="library-status" role="status">Connexion à la bibliothèque…</p>' +
    '<div id="library-list" aria-label="Fichiers disponibles"></div>' +
    '<div class="library-pages"><button id="library-prev" type="button" hidden>← Précédent</button><span id="library-page"></span><button id="library-more" type="button" hidden>Suivant →</button></div>' +
    '<details id="library-upload"><summary>＋ Envoyer depuis ce PC</summary>' +
    '<p>Le fichier et son image 2D seront enregistrés sur le serveur.</p>' +
    '<label for="library-input">Fichier G-code — 20 Mo maximum</label>' +
    '<input id="library-input" type="file" accept=".nc,.gcode,.tap,.ngc,.cnc,.txt">' +
    '<button id="library-send" class="library-primary" type="button" disabled>Envoyer à la bibliothèque</button>' +
    '<button id="library-cancel" type="button" hidden>Annuler la préparation</button>' +
    '<p id="library-upload-status" role="status">Aucun fichier choisi.</p></details></div>' +
    '<div class="card library-detail"><div class="library-eyebrow">FICHIER SÉLECTIONNÉ</div>' +
    '<h2 id="library-name">Sélectionnez un fichier</h2>' +
    '<p id="library-meta" class="mute"></p>' +
    '<div class="library-image-wrap"><img id="library-image" alt="Aperçu du parcours XY" hidden>' +
    '<p id="library-image-status">L’aperçu 2D apparaîtra ici.</p></div>' +
    '<p id="library-preview-note" class="mute"></p>' +
    '<div id="library-dimensions-content" hidden><p id="library-dimensions-file"></p>' +
    '<p id="library-dimensions-status" role="status">Sélectionnez un fichier dans la bibliothèque.</p>' +
    '<table id="library-dimensions-table" class="ks-dimensions-table" hidden><thead><tr><th scope="col">Axe</th><th scope="col">Minimum</th><th scope="col">Maximum</th><th scope="col">Étendue</th></tr></thead>' +
    '<tbody><tr><th scope="row">X</th><td id="library-dimensions-xmin"></td><td id="library-dimensions-xmax"></td><td id="library-dimensions-width"></td></tr>' +
    '<tr><th scope="row">Y</th><td id="library-dimensions-ymin"></td><td id="library-dimensions-ymax"></td><td id="library-dimensions-height"></td></tr></tbody></table>' +
    '<p>Trajets rapides G0 inclus. Départ supposé X0 Y0. Projection XY approximative : ce ne sont pas les dimensions de la pièce. Z non représenté.</p></div>' +
    '<button id="library-regenerate" type="button" disabled>Régénérer l’aperçu depuis ce PC</button>' +
    '<p id="library-regenerate-status" role="status"></p>' +
    '<div class="library-execution"><strong>Stocké pour plus tard</strong>' +
    '<p>L’envoi et la sélection ne démarrent pas la machine.</p>' +
    '<button type="button" disabled>Exécution — prochaine étape</button></div></div>';

  var $ = function (id) { return document.getElementById(id); };
  var files = [], selected = '', signature = '', detailVersion = '', requestId = 0;
  var refreshing = false, busy = false, generation = 0, reader = null, pageSize = 4, page = 0;
  var mounted = false, refreshId = 0, refreshAgain = 0, refreshPromise = null, requests = {}, rows = Object.create(null), listKey = '', deferredText = {}, detailLoading = false;
  var regenerating = false, regenerationId = 0;
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
  function request(method, path, body, kind, cancelled, responseBlob) {
    return new Promise(function (resolve, reject) {
      if (cancelled && cancelled()) { reject(new Error('Lecture annulée.')); return; }
      var token = auth();
      if (!token) { reject(new Error('Ouvrez CNCjs à la racine du serveur pour établir la session, puis rechargez cette page.')); return; }
      var xhr = new XMLHttpRequest();
      if (kind) requests[kind] = xhr;
      function done() { if (kind && requests[kind] === xhr) delete requests[kind]; }
      xhr.open(method, '/api/watch/' + path, true);
      if (responseBlob) {
        try {
          xhr.responseType = 'blob';
          if (xhr.responseType !== 'blob') throw new Error('Blob indisponible');
        } catch (_) { done(); reject(new Error('Lecture binaire indisponible : utilisez un navigateur compatible pour régénérer l’aperçu.')); return; }
      }
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.timeout = 120000;
      if (body) xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        done();
        // A completed obsolete read must not parse a potentially large G-code response.
        if (cancelled && cancelled()) { reject(new Error('Lecture annulée.')); return; }
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(xhr.status === 401 || xhr.status === 403 ? 'Session expirée : ouvrez CNCjs et reconnectez-vous.' : 'Le serveur a refusé la demande (HTTP ' + xhr.status + ').')); return;
        }
        if (responseBlob) { resolve(xhr.response); return; }
        try { resolve(JSON.parse(xhr.responseText)); } catch (_) { reject(new Error('Réponse du serveur illisible.')); }
      };
      xhr.onerror = function () { done(); reject(new Error('Serveur inaccessible. Vérifiez la connexion réseau.')); };
      xhr.ontimeout = function () { done(); reject(new Error('Le serveur ne répond pas. Actualisez la liste avant de réessayer.')); };
      xhr.onabort = function () { done(); reject(new Error('Lecture annulée.')); };
      xhr.send(body ? (typeof Blob !== 'undefined' && body instanceof Blob ? body : JSON.stringify(body)) : null);
    });
  }
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : Math.max(1, Math.ceil(n / 1024)) + ' Ko'; }
  function displayName(name) { return name.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/, ''); }
  function dimensions(bounds, message) {
    var fields = ['xmin', 'ymin', 'xmax', 'ymax', 'width', 'height'];
    var valid = Array.isArray(bounds) && bounds.length === 4 && bounds.every(function (n) { return typeof n === 'number' && isFinite(n); }) &&
      bounds[2] >= bounds[0] && bounds[3] >= bounds[1] && isFinite(bounds[2] - bounds[0]) && isFinite(bounds[3] - bounds[1]);
    property($('library-dimensions-table'), 'hidden', !valid);
    setText('library-dimensions-status', valid ? 'D’après l’aperçu enregistré · en millimètres' : message || 'Dimensions indisponibles. Régénérez l’aperçu depuis le PC via « Détails de l’aperçu ».');
    var values = valid ? bounds.concat([bounds[2] - bounds[0], bounds[3] - bounds[1]]) : [];
    fields.forEach(function (field, i) {
      var value = values[i];
      setText('library-dimensions-' + field, valid ? (Math.abs(value) < 0.005 ? 0 : value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
    });
  }
  function selectedRow() {
    if (!visible()) return;
    Object.keys(rows).forEach(function (key) { attribute(rows[key], 'aria-pressed', key === selected ? 'true' : 'false'); });
  }
  function renderList() {
    if (!visible()) return;
    var query = $('library-search').value.toLowerCase();
    var matches = files.filter(function (f) { return displayName(f.name).toLowerCase().indexOf(query) >= 0; });
    page=Math.min(page,Math.max(0,Math.ceil(matches.length/pageSize)-1));
    var shown = matches.slice(page*pageSize, (page+1)*pageSize);
    var key = JSON.stringify([shown, files.length, matches.length, query, page, pageSize, selected]);
    if (key === listKey) return; listKey = key;
    var list = $('library-list'), desired = [], keep = Object.create(null), focused = document.activeElement;
    setText('library-count', files.length);
    shown.forEach(function (f) {
      var button = rows[f.name];
      if (!button) {
        button = document.createElement('button'); button.type = 'button'; button.className = 'library-file'; button.setAttribute('data-file', f.name);
        button._name = document.createElement('strong'); button._info = document.createElement('span');
        button.appendChild(button._name); button.appendChild(button._info);
        button.addEventListener('click', function () { select(button._file, false); });
        rows[f.name] = button;
      }
      button._file = f;
      property(button._name, 'textContent', displayName(f.name));
      property(button._info, 'textContent', size(f.size) + ' · ' + new Date(f.mtime).toLocaleString('fr-FR'));
      desired.push(button); keep[f.name] = true;
    });
    if (!desired.length) {
      var empty = list._empty || (list._empty = document.createElement('p'));
      property(empty, 'textContent', files.length ? 'Aucun résultat.' : 'La bibliothèque est vide. Envoyez un premier fichier depuis le PC.'); desired.push(empty);
    }
    desired.forEach(function (node, i) { if (list.children[i] !== node) list.insertBefore(node, list.children[i] || null); });
    while (list.children.length > desired.length) list.removeChild(list.lastChild);
    if (focused && list.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
    Object.keys(rows).forEach(function (name) { if (!keep[name]) delete rows[name]; });
    property($('library-more'), 'hidden', (page+1)*pageSize >= matches.length);
    property($('library-prev'), 'hidden', page === 0);
    setText('library-page', matches.length?'Page '+(page+1)+' / '+Math.ceil(matches.length/pageSize):'');
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
    dimensions(null, 'Chargement des dimensions enregistrées…');
    $('library-meta').textContent = size(f.size) + ' · ' + new Date(f.mtime).toLocaleString('fr-FR');
    $('library-image').hidden = true; $('library-image').removeAttribute('src');
    $('library-image-status').hidden = false; $('library-image-status').textContent = 'Chargement de l’image…';
    $('library-preview-note').textContent = '';
    request('POST', 'file', { file: f.name + suffix }, 'detail').then(function (response) {
      if (id !== requestId) return;
      var meta = JSON.parse(response.data);
      if (meta.version !== 1 || meta.file !== f.name || typeof meta.originalName !== 'string') throw new Error('Métadonnées non reconnues');
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
          $('library-image-status').textContent = 'Image illisible. Le G-code reste enregistré.';
        };
        $('library-image').src = image;
        $('library-preview-note').textContent = String(meta.preview.note || '') + ' · ' + Number(meta.preview.segments || 0).toLocaleString('fr-FR') + ' segments.';
      } else { detailLoading = false; $('library-image-status').textContent = 'Aperçu indisponible : ' + String(meta.previewError || 'aucune image enregistrée') + '. Le G-code reste disponible.'; }
    }).catch(function () {
      if (id !== requestId) return;
      detailLoading = false;
      detailVersion = ''; // Retry a sidecar still being uploaded at the next refresh.
      dimensions(null);
      $('library-image-status').textContent = 'Aucune image disponible pour ce fichier. Envoyez-le depuis cette interface pour créer son aperçu.';
    });
  }
  function refresh(manual) {
    if (!visible()) { refreshAgain = Math.max(refreshAgain, manual ? 2 : 1); return Promise.resolve(); }
    if (refreshing) { refreshAgain = Math.max(refreshAgain, manual ? 2 : 1); return refreshPromise; }
    refreshing = true; var id = ++refreshId;
    refreshPromise = request('GET', 'status', null, 'list').then(function (status) {
      if (id !== refreshId) return null;
      if (!status.configured) throw new Error('Le dossier partagé CNCjs n’est pas encore configuré.');
      return request('POST', 'files', { path: '' }, 'list');
    }).then(function (response) {
      if (id !== refreshId || !response) return;
      var all = response.files || [];
      files = all.filter(function (f) { return f.type === 'f' && /\.(nc|gcode|tap|ngc|cnc|txt)$/i.test(f.name); });
      var previews = {};
      all.forEach(function (f) { if (f.name.slice(-suffix.length) === suffix) previews[f.name.slice(0, -suffix.length)] = f.mtime; });
      files.forEach(function (f) { f.previewMtime = previews[f.name] || ''; });
      files.sort(function (a, b) { return new Date(b.mtime) - new Date(a.mtime) || a.name.localeCompare(b.name); });
      var sig = JSON.stringify(all.map(function (f) { return [f.name, f.size, f.mtime]; }));
      if (sig !== signature) { signature = sig; renderList(); }
      setText('library-status', 'À jour · ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      var f = files.filter(function (item) { return item.name === selected; })[0] || files[0];
      if (f) select(f, !!manual);
      else {
        if (selected) { cancelRegeneration(); setText('library-regenerate-status', ''); }
        selected = ''; detailVersion = ''; detailLoading = false; requestId++;
        cancelRequest('detail');
        publishSelection(null);
        $('library-regenerate').disabled = true;
        $('library-name').textContent = 'Sélectionnez un fichier'; $('library-meta').textContent = '';
        $('library-dimensions-file').textContent = '';
        dimensions(null, 'Sélectionnez un fichier dans la bibliothèque.');
        $('library-image').hidden = true; $('library-image-status').hidden = false;
        $('library-image-status').textContent = 'L’aperçu 2D apparaîtra ici.'; $('library-preview-note').textContent = '';
      }
    }).catch(function (error) { if (id === refreshId) setText('library-status', error.message); }).then(function () {
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
  function read(file) {
    return new Promise(function (resolve, reject) {
      reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('Lecture du fichier impossible.')); };
      reader.onabort = function () { reject(new Error('Annulé')); };
      reader.readAsText(file);
    });
  }
  $('library-input').addEventListener('change', function () {
    var f = this.files[0]; $('library-send').disabled = !f;
    $('library-upload-status').textContent = f ? f.name + ' · ' + size(f.size) : 'Aucun fichier choisi.';
  });
  $('library-cancel').addEventListener('click', function () {
    generation++;
    if (reader && reader.readyState === 1) reader.abort();
    lock(false); $('library-upload-status').textContent = 'Préparation annulée. Aucun fichier envoyé.';
  });
  $('library-send').addEventListener('click', function () {
    var file = $('library-input').files[0];
    if (!file || busy) return;
    if (!/\.(nc|gcode|tap|ngc|cnc|txt)$/i.test(file.name) || !file.size || file.size > 20 * 1048576) {
      $('library-upload-status').textContent = 'Choisissez un G-code non vide de 20 Mo maximum.'; return;
    }
    var current = ++generation, text = '', stored = safeName(file.name), wrote = false;
    var meta = { version: 1, file: stored, originalName: file.name, bytes: file.size, createdAt: new Date().toISOString() };
    function cancelled() { return current !== generation; }
    function status(s) { if (!cancelled()) setText('library-upload-status', s); }
    lock(true); status('Lecture du fichier…');
    read(file).then(function (data) {
      if (cancelled()) throw new Error('Annulé');
      text = data;
      if (/\x00/.test(text)) throw new Error('Ce fichier semble binaire. Un G-code texte est attendu.');
      return window.CNCLibraryPreview.render(text, document.createElement('canvas'), cancelled, status).then(function (preview) {
        if (preview.image.length > 2500000) meta.previewError = 'image trop volumineuse'; else meta.preview = preview;
      }).catch(function (error) { if (cancelled()) throw error; meta.previewError = error.message; });
    }).then(function () {
      if (cancelled()) throw new Error('Annulé');
      var payload = window.CNCLibraryPayload;
      return payload ? payload.encodeFile(stored, text, cancelled, status) : { file: stored, data: text };
    }).then(function (payload) {
      if (cancelled()) throw new Error('Annulé');
      $('library-cancel').hidden = true; // Once the server write starts, report its actual outcome.
      status('Envoi du G-code au serveur…');
      text = '';
      return request('PUT', 'file', payload);
    }).then(function () {
      wrote = true; text = ''; status('Enregistrement de l’image 2D…');
      return request('PUT', 'file', { file: stored + suffix, data: JSON.stringify(meta) });
    }).then(function () {
      if (selected !== stored) { cancelRegeneration(); setText('library-regenerate-status', ''); }
      selected = stored; detailVersion = ''; $('library-input').value = ''; lock(false);
      publishSelection(stored, file.name);
      status('✓ ' + file.name + ' enregistré. Disponible sur la Surface.' + (meta.previewError ? ' Aperçu indisponible : ' + meta.previewError : ''));
      previewChanged(stored);
      return refresh(true);
    }).catch(function (error) {
      if (cancelled()) return;
      lock(false); status((wrote ? 'G-code enregistré, mais image non enregistrée. ' : 'Envoi non confirmé. ') + error.message);
      refresh(true);
    });
  });
  $('library-refresh').addEventListener('click', function () { refresh(true); });
  $('library-regenerate').addEventListener('click', function () {
    if (regenerating || !selected) return;
    var file = files.filter(function (f) { return f.name === selected; })[0];
    if (!file || file.size > 20 * 1048576) return;
    regenerating = true;
    var name = file.name, meta, current = ++regenerationId;
    function cancelled() { return current !== regenerationId || selected !== name; }
    function check() { if (cancelled()) throw new Error('Sélection modifiée : régénération annulée.'); }
    function status(value) { if (!cancelled()) setText('library-regenerate-status', value); }
    status('Lecture du fichier enregistré…');
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
      if (preview.image.length > 2500000) throw new Error('Image trop volumineuse.');
      meta.preview = preview; delete meta.previewError; meta.previewVersion = 2;
      return request('POST', 'files', {path:''}, 'regenerate', cancelled);
    }).then(function (result) {
      check();
      var current = result.files.filter(function (f) {return f.name === name;})[0];
      if (!current || current.mtime !== file.mtime || current.size !== file.size || cancelled()) throw new Error('Fichier ou sélection modifiés : relancez la régénération.');
      // Once transmitted, this write is allowed to finish even if selection changes.
      return request('PUT', 'file', {file:name+suffix, data:JSON.stringify(meta)});
    }).then(function () {
      if (selected === name) detailVersion = '';
      status('✓ Aperçu mis à jour sur le serveur, visible aussi sur la Surface.');
      previewChanged(name);
      return refresh(false);
    }).catch(function (error) { status('Aperçu non modifié : ' + error.message); }).then(function () { if (current === regenerationId) regenerating = false; });
  });
  $('library-search').addEventListener('input', function () { page = 0; renderList(); });
  $('library-more').addEventListener('click', function () { page++; renderList(); });
  $('library-prev').addEventListener('click', function () { page=Math.max(0,page-1); renderList(); });
  window.addEventListener('cnc-library-page-size',function(e){
    var size=Number(e.detail);
    if(size!==2&&size!==4)return;
    if(size!==pageSize){page=Math.floor(page*pageSize/size);pageSize=size;renderList();}
  });
  function mount() {
    if (mounted || !visible()) return;
    mounted = true;
    Object.keys(deferredText).forEach(function (id) { setText(id, deferredText[id]); }); deferredText = {};
    renderList();
    var manual = refreshAgain === 2; refreshAgain = 0;
    refresh(manual);
  }
  function unmount() {
    if (!mounted) return;
    mounted = false; refreshId++; requestId++;
    if (detailLoading) detailVersion = '';
    detailLoading = false; $('library-image').onload = null; $('library-image').onerror = null;
    cancelRequest('list'); cancelRequest('detail');
    refreshing = false; refreshPromise = null;
  }
  window.addEventListener('cnc-screen-change', function (e) { if (e.detail === 'files') mount(); else unmount(); });
  document.addEventListener('visibilitychange', function () { if (visible()) mount(); else unmount(); });
  window.cncLibraryView = { mount: mount, unmount: unmount };
  mount();
})();
