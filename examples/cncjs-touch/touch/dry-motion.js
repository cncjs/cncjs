(function () {
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  // Server-validated rehearsal only. This endpoint cannot execute a movement.
  if (document.body && document.body.getAttribute('data-simulation') === 'true') return;
  var $ = function (id) { return document.getElementById(id); };
  var buttons = document.querySelectorAll('.jog'), machine = null, busy = false, received = 0;
  var step = 1, feed = 800, socket = window.cncSocket, compact = !!(window.cncState&&window.CNCJobStream), blocked = !socket || !socket.connected;
  var request = null, version = 0, currentScreen='jog', timer=null;
  function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }
  function reason() {
    if (document.hidden) return 'Page masquée : essais bloqués.';
    if (compact ? !window.cncState.get().transportConnected : blocked || !socket || !socket.connected) return 'Serveur déconnecté : essais bloqués.';
    if (!machine) return 'Aucun contrôleur suivi. Ouvrez la connexion dans CNCjs.';
    if (!machine.fresh || Date.now() - received >= 3000) return 'État du contrôleur périmé : attendez son actualisation.';
    if (machine.type !== 'Grbl' || !machine.port) return 'Contrôleur Grbl requis pour cet essai.';
    if (busy || machine.loading) return 'Une opération est en cours : essais bloqués.';
    if (machine.workflow !== 'idle' || machine.activeState !== 'Idle') return 'Contrôleur non prêt (' + (machine.activeState || uiLocale.t('état inconnu')) + ') : essais bloqués.';
    if (!machine.canLoad) return machine.loadReason || 'Commandes en attente : essais bloqués.';
    if (machine.canPreviewMotion !== true) return machine.motionReason || 'Vérification serveur indisponible : actualisez la page.';
    return '';
  }
  function render() {
    var why = reason();
    if (why && request) cancel();
    var disabled = !!why || !!request;
    buttons.forEach(function (b) { if (b.disabled !== disabled) b.disabled = disabled; });
    if(currentScreen!=='jog')return;
    setText($('jog-msg'), why || (request ? 'Vérification par le serveur…' : 'Prêt pour un essai à blanc · pas ' + step + ' mm · ' + feed + ' mm/min.'));
    setText($('jog-controller'), machine && machine.port ? uiLocale.t('Contrôleur suivi : ') + machine.port : uiLocale.t('Contrôleur suivi : aucun'));
    if (why) setText($('jog-feedback'), uiLocale.t('Aucun déplacement réel. Origines et palpage non activés.'));
  }
  function cancel() {
    version++;
    var previous = request; request = null;
    if (previous) previous.abort();
  }
  function verify(body) {
    var token = '';
    try { token = JSON.parse(localStorage.getItem('cnc')).state.session.token; } catch (_) {}
    if (!token) { setText($('jog-feedback'), 'Session CNCjs requise. Aucun mouvement envoyé.'); return; }
    var xhr = new XMLHttpRequest(), id = ++version;
    request = xhr;
    xhr.open('POST', (window.cncState?window.cncState.get().apiBase:'/api')+'/touch-motion/preview', true); xhr.timeout = 5000;
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.setRequestHeader('Content-Type', 'application/json');
    function finish(message) {
      if (id !== version) return;
      request = null; render();
      if (!reason() && machine.port === body.port) setText($('jog-feedback'), message);
    }
    xhr.onload = function () {
      if (id !== version) return;
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (_) { data = {}; }
      if (xhr.status < 200 || xhr.status >= 300) {
        finish((typeof data.message === 'string' ? data.message : 'Vérification refusée par le serveur.') + ' Aucun mouvement envoyé.'); return;
      }
      if (data.dryRun !== true || data.port !== body.port || data.axis !== body.axis ||
          data.distanceMm !== body.direction * body.step || data.feedMmMin !== body.feed) {
        finish('Réponse serveur incohérente. Aucun mouvement envoyé.'); return;
      }
      finish('Vérifié par le serveur : ' + body.axis + (body.direction > 0 ? '+' : '−') + ' · ' + body.step + ' mm · ' + body.feed + ' mm/min. Aucun mouvement envoyé.');
    };
    xhr.onerror = xhr.ontimeout = function () { finish('Serveur injoignable. Essai non validé ; aucun mouvement envoyé.'); };
    render();
    setText($('jog-feedback'), 'Vérification en cours. Aucun mouvement envoyé.');
    try { xhr.send(JSON.stringify(body)); } catch (_) { finish('Vérification impossible. Aucun mouvement envoyé.'); }
  }
  function choice(id, attribute, values, assign) {
    var options = $(id).querySelectorAll('button');
    options.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.classList.contains('active')));
      b.addEventListener('click', function () {
        var value = Number(b.getAttribute(attribute));
        if (values.indexOf(value) < 0) return;
        cancel();
        assign(value);
        options.forEach(function (other) { other.classList.toggle('active', other === b); other.setAttribute('aria-pressed', String(other === b)); });
        setText($('jog-feedback'), uiLocale.t('Aucun déplacement réel. Origines et palpage non activés.')); render();
      });
    });
  }
  choice('steps', 'data-step', [0.1, 1, 10], function (value) { step = value; });
  choice('feeds', 'data-feed', [200, 800, 1500], function (value) { feed = value; });
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      if (reason() || request) { render(); return; }
      var axis = b.getAttribute('data-axis'), direction = Number(b.getAttribute('data-dir'));
      if (['X', 'Y', 'Z'].indexOf(axis) < 0 || (direction !== -1 && direction !== 1)) return;
      verify({ port: machine.port, axis: axis, direction: direction, step: step, feed: feed });
    });
  });
  window.addEventListener('cnc-job-status', function (e) {
    if (!e.detail || e.detail.simulation) return;
    var next = e.detail.machine;
    if (!machine || !next || machine.port !== next.port) { cancel(); setText($('jog-feedback'), uiLocale.t('Aucun déplacement réel. Origines et palpage non activés.')); }
    machine = next; busy = !!e.detail.busy; received = Date.now(); render();
  });
  if (socket&&!compact) {
    ['disconnect', 'connect_error', 'error'].forEach(function (event) {
      socket.on(event, function () { blocked = true; machine = null; render(); });
    });
    socket.on('connect', function () { blocked = false; machine = null; render(); });
  }
  function viewTimer(){
    if(timer!==null){if(typeof clearInterval==='function')clearInterval(timer);timer=null;}
    if(currentScreen==='jog'&&!document.hidden)timer=setInterval(render,1000);
  }
  window.addEventListener('cnc-screen-change',function(e){currentScreen=e.detail;if(currentScreen!=='jog')cancel();viewTimer();render();});
  document.addEventListener('visibilitychange', function () { machine = null; viewTimer();render(); });
  window.addEventListener('pagehide',function(e){if(e.persisted)return;cancel();if(timer!==null&&typeof clearInterval==='function')clearInterval(timer);timer=null;});
  viewTimer();
  render();
})();
