(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var store = window.cncState, host = document.querySelector('.ks-machine-overview');
  if (!store || !host) return;
  var simulation = document.body.getAttribute('data-simulation') === 'true';
  var panel = document.createElement('div'); panel.className = 'connection-details';
  var title = document.createElement('h3'); title.textContent = uiLocale.t('Fraîcheur des données'); panel.appendChild(title);
  function line(id) { var el = document.createElement('p'); el.id = id; panel.appendChild(el); return el; }
  var transport = line('connection-transport'), report = line('connection-report'), explanation = line('connection-explanation');
  host.appendChild(panel);
  var bar = !simulation && document.getElementById('status-bar'), badge = null;
  if (bar) { badge = document.createElement('span'); badge.id = 'st-report-age'; badge.className = 'badge warn'; bar.appendChild(badge); }
  var latest = {}, receivedAt = 0, disposed = false, bindings = [];
  function text(el, value) { if (el && el.textContent !== value) el.textContent = value; }
  function style(el, value) { if (el && el.className !== value) el.className = value; }
  function visible() { var screen = document.getElementById('screen-machine'); return !document.hidden && screen && screen.classList.contains('active'); }
  function render() {
    if (disposed || document.hidden) return;
    var c = latest.machine, connected = !!latest.transportConnected;
    var age = c && c.statusAgeMs, known = typeof age === 'number' && isFinite(age) && age >= 0;
    if (known) age += Math.max(0, Date.now() - receivedAt);
    var usable = known && age <= 2500 && !!c.fresh;
    var ageText = !known ? uiLocale.t('âge inconnu') : age < 1000 ? uiLocale.t('moins de 1 s') : age < 60000 ? Math.ceil(age / 1000) + ' s' : Math.ceil(age / 60000) + ' min';
    var tone = !connected || !c || !usable ? 'warn' : 'ok';
    if (known && age >= 15000) tone = 'err';
    var transportText = simulation ? uiLocale.t('Simulateur local · aucune liaison machine.') : uiLocale.t('Suivi continu : ') + (connected ? uiLocale.t('connecté.') : uiLocale.t('indisponible.'));
    var reportText = simulation ? uiLocale.t('Rapports Grbl : non utilisés en simulation.') : !c ? uiLocale.t('Rapport Grbl : aucun contrôleur sélectionné.') :
      uiLocale.t('Rapport Grbl · ') + c.port + ' : ' + ageText + (usable ? uiLocale.t(' · récent.') : uiLocale.t(' · non exploitable pour démarrer.'));
    var reason = simulation ? uiLocale.t('Les états fictifs ne valident pas la connexion à la CNC.') : latest.transportReason ||
      (!connected ? uiLocale.t('Le suivi doit être rétabli avant de charger, démarrer ou reprendre.') : !c ? uiLocale.t('Sélectionnez un contrôleur dans Fichiers → Détails de l’aperçu.') :
        !known ? uiLocale.t('Aucun âge fiable reçu. Une connexion serveur ne garantit pas un rapport machine récent.') :
        age > 2500 ? uiLocale.t('Le serveur répond, mais le rapport machine est trop ancien. Attendez un nouveau rapport.') :
        !usable ? uiLocale.t('Rapport reçu, mais non validé par le suivi. Attendez le rétablissement du suivi.') :
        uiLocale.t('Âge du rapport machine, distinct de la liaison serveur. Un rapport récent ne garantit pas que le démarrage est autorisé.'));
    // This projection uses the age already maintained by job-controls. No extra timer or request.
    text(badge, !c ? uiLocale.t('Rapport : —') : uiLocale.t('Rapport : ') + ageText);
    style(badge, 'badge ' + tone);
    if (visible()) {
      text(transport, transportText); text(report, reportText); text(explanation, reason);
      style(report, 'connection-report ' + (simulation ? 'simulation' : tone));
    }
  }
  function bind(target, name, fn) { target.addEventListener(name, fn); bindings.push(function () { target.removeEventListener(name, fn); }); }
  var unsubscribe = store.subscribe(function (state) { if (state.machine !== latest.machine) receivedAt = Date.now(); latest = state; render(); });
  bind(window, 'cnc-screen-change', render); bind(document, 'visibilitychange', render);
  function dispose() { if (disposed) return; disposed = true; unsubscribe(); bindings.forEach(function (fn) { fn(); }); bindings = []; }
  bind(window, 'pagehide', function (event) { if (!event || !event.persisted) dispose(); });
  window.cncConnectionStatus = { dispose: dispose };
})();
