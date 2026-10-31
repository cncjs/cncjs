(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var $ = function (id) { return document.getElementById(id); };
  var store = window.cncState, compact = !!(store&&window.CNCJobStream), disposers = [], droTimer = null, latestState = null, lastPaint = 0, coordinateSignature='';
  // Live values (4 per second during a job) are written into their single text node:
  // replacing the node (textContent) also restyles it.
  function setText(el, text) { if (!el || el.textContent === text) return; var n = el.firstChild; if (n && n.nodeType === 3 && !n.nextSibling) n.data = text; else el.textContent = text; }
  function bind(target,name,fn){target.addEventListener(name,fn);disposers.push(function(){target.removeEventListener(name,fn);});}

  function badge(id, text, cls) {
    var el = $(id);
    setText(el, text);
    var name = 'badge' + (cls ? ' ' + cls : '');
    if (el.className !== name) el.className = name;
  }
  function notice(msg) {
    var el = $('notice');
    setText(el, msg || '');
    if (el.hidden !== !msg) el.hidden = !msg;
  }
  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? '–' : n.toFixed(3);
  }
  function clearCoords() {
    latestState = null;
    coordinateSignature='';
    if (droTimer !== null) { clearTimeout(droTimer); droTimer = null; }
    ['wx','wy','wz','mx','my','mz'].forEach(function (id) { setText($(id), '–'); });
  }

  var saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('cnc') || '{}');
  } catch (e) {}

  var token = saved.state && saved.state.session &&
              saved.state.session.token;

  if (!token) {
    badge('st-server', uiLocale.t('Serveur : authentification requise'), 'warn');
    notice(uiLocale.t("Ouvrez CNCjs à la racine du même serveur, connectez-vous, puis rechargez /touch/."));
    return;
  }

  var socket = compact ? null : io.connect(location.origin, {
    reconnection: true,
    query: 'token=' + encodeURIComponent(token)
  });
  function on(name,fn){if(!socket)return;socket.on(name,fn);disposers.push(function(){if(socket.off)socket.off(name,fn);else if(socket.removeListener)socket.removeListener(name,fn);});}

  function authError(err) {
    badge('st-server', uiLocale.t('Serveur : connexion refusée'), 'err');
    notice(uiLocale.t('Erreur CNCjs : ') + (
      err && (err.message || err.description) || String(err)
    ));
  }
  on('error', authError);
  on('connect_error', authError);
  window.cncSocket = socket;

  var bar = document.getElementById('status-bar');
  if (bar) {
    var reloadButton = document.createElement('button');
    reloadButton.type = 'button';
    reloadButton.textContent = uiLocale.t('↻ Actualiser');
    bind(reloadButton,'click', function () {
      location.reload();
    });
    bar.appendChild(reloadButton);
  }

  on('connect', function () {
    badge('st-server', uiLocale.t('Serveur : connecté'), 'ok');
  });

  on('disconnect', function () {
    badge('st-server', uiLocale.t('Serveur : déconnecté'), 'err');
    badge('st-ctrl', uiLocale.t('Contrôleur : inconnu'), 'warn');
    badge('st-state', uiLocale.t('État : données périmées'), 'warn');
    clearCoords();
    notice(uiLocale.t('Connexion au serveur perdue. Les valeurs affichées ne sont plus à jour.'));
  });

  function paintCoordinates() {
    droTimer = null;
    if (!latestState) return;
    lastPaint = Date.now();
    var w = latestState.wpos || {}, m = latestState.mpos || {};
    ['x','y','z'].forEach(function (axis) { setText($('w'+axis), num(w[axis])); setText($('m'+axis), num(m[axis])); });
  }
  function receive(type, state, port) {
    badge('st-ctrl', uiLocale.t('Contrôleur : ') + (port || type), 'ok');
    var s = state && state.status;
    if (!s) return;
    var a = s.activeState || '';
    var cls = /alarm/i.test(a) ? 'err' : /hold|door/i.test(a) ? 'warn' : 'ok';
    badge('st-state', uiLocale.t('État : ') + a, cls);
    var signature=JSON.stringify([s.wpos,s.mpos]);
    if(signature===coordinateSignature)return;
    coordinateSignature=signature;
    latestState = s;
    if (Date.now() - lastPaint >= 150) paintCoordinates();
    else if (droTimer === null) droTimer = setTimeout(paintCoordinates, 150 - (Date.now() - lastPaint));
  }
  if (store) disposers.push(store.subscribe(function (state) {
    if(compact)badge('st-server',state.transportConnected?uiLocale.t('Serveur : suivi connecté'):uiLocale.t('Serveur : suivi indisponible'),state.transportConnected?'ok':'warn');
    var machine = state.machine;
    if (!machine || !machine.fresh) {
      clearCoords();
      badge('st-ctrl', machine ? uiLocale.t('Contrôleur : ')+machine.port : uiLocale.t('Contrôleur : aucun sélectionné'), 'warn');
      badge('st-state', uiLocale.t('État : données indisponibles'), 'warn');
      notice(state.transportReason || (machine ? uiLocale.t('Rapport machine périmé.') : uiLocale.t('Choisissez le contrôleur dans Fichiers.')));
      return;
    }
    receive(machine.type, {status:{activeState:machine.activeState,wpos:machine.coordinates&&machine.coordinates.wpos,mpos:machine.coordinates&&machine.coordinates.mpos}},machine.port);
    notice(state.transportReason||'');
  }));
  window.cncConnection = {dispose:function(){
    clearCoords();
    disposers.forEach(function(dispose){dispose();});disposers=[];
    if(socket&&socket.disconnect)socket.disconnect();
  }};
  bind(window,'pagehide',function(event){if(!event||!event.persisted)window.cncConnection.dispose();});

  if(!compact)badge('st-server', uiLocale.t('Serveur : connexion…'), 'warn');

  // Navigation entre écrans (affichage uniquement)
  var tabs = document.querySelectorAll('.tab');
  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle('active', screens[i].id === 'screen-' + name);
    }
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].classList.toggle('active', tabs[j].getAttribute('data-screen') === name);
    }
  }
  for (var k = 0; k < tabs.length; k++) {
    bind(tabs[k],'click', function () {
      showScreen(this.getAttribute('data-screen'));
    });
  }
})();

