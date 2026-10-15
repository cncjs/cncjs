(function () {
  'use strict';
  var key = 'cncjs-touch-display-v1';
  var panel = document.getElementById('screen-settings');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'screen-settings';panel.className = 'screen';
    document.querySelector('main').appendChild(panel);
  }
  panel.innerHTML = '<div class="card wide ks-panel-intro"><div><h2>Votre écran</h2><p>Préférences conservées dans ce navigateur.</p></div><span class="ks-readonly" id="display-resolution"></span></div>' +
    '<div class="card ks-display-card"><h2>Taille du texte</h2><p>Choisissez le confort de lecture.</p><div class="ks-display-choices" role="group" aria-label="Taille du texte"><button type="button" data-display-size="standard" aria-pressed="true"><span class="ks-text-sample">Aa</span>Standard</button><button type="button" data-display-size="large" aria-pressed="false"><span class="ks-text-sample ks-text-large">Aa</span>Agrandi</button></div></div>' +
    '<div class="card ks-display-card"><h2>Suivi du travail réel</h2><p>Coordonnées machine en plus des coordonnées de travail.</p><button type="button" id="display-machine-toggle" class="ks-display-toggle" aria-pressed="true"><span>Coordonnées machine</span><b id="display-machine-state">Affichées</b></button><p class="ks-help">Ce choix concerne le suivi réel. Les positions restent disponibles dans Déplacer / Origine.</p></div>' +
    '<div class="card ks-display-fullscreen"><div><h2>Plein écran</h2><p id="display-fullscreen-state">Utiliser toute la surface disponible.</p></div><button type="button" id="display-fullscreen" class="ks-secondary">Passer en plein écran</button></div>' +
    '<div class="card ks-display-sleep"><h2>Veille de l’écran</h2><label for="display-sleep-delay">Après une période sans interaction</label><div class="ks-sleep-controls"><select id="display-sleep-delay"><option value="0">Jamais</option><option value="1">1 minute</option><option value="2">2 minutes</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="30">30 minutes</option></select><button id="display-sleep-test" type="button" class="ks-secondary">Tester</button></div><p>Écran noir logiciel. Le travail continue. Un toucher réveille sans actionner les commandes.</p></div>' +
    '<div class="wide ks-display-footer"><p id="display-feedback" role="status">Aucun réglage du contrôleur modifié.</p><button type="button" id="display-reset" class="ks-secondary">Rétablir l’affichage</button></div>';
  var sizes = panel.querySelectorAll('[data-display-size]');
  var machine = document.getElementById('display-machine-toggle');
  var feedback = document.getElementById('display-feedback');
  var fullscreen = document.getElementById('display-fullscreen');
  var prefs = { size: 'standard', machine: true, sleepMinutes: 5 };
  try {
    var saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === 'object') {
      prefs.size = saved.size === 'large' ? 'large' : 'standard';
      prefs.machine = saved.machine !== false;
      if ([0,1,2,5,10,30].indexOf(saved.sleepMinutes) >= 0) prefs.sleepMinutes = saved.sleepMinutes;
    }
  } catch (error) {}
  var home = document.getElementById('screen-home');
  var card = home ? home.querySelector('#mx') : null;
  while (card && card !== home && !card.classList.contains('card')) card = card.parentElement;
  if (card && card !== home) card.classList.add('home-machine-coordinates');
  function apply() {
    document.body.classList.toggle('display-large', prefs.size === 'large');
    document.body.classList.toggle('display-hide-machine', !prefs.machine);
    sizes.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-display-size') === prefs.size)); });
    machine.setAttribute('aria-pressed', String(prefs.machine));
    document.getElementById('display-machine-state').textContent = prefs.machine ? 'Affichées' : 'Masquées';
    document.getElementById('display-sleep-delay').value = String(prefs.sleepMinutes);
    if (window.cncScreenSaver) window.cncScreenSaver.configure(prefs.sleepMinutes);
    window.dispatchEvent(new Event('resize'));
  }
  function save() {
    apply();
    try { localStorage.setItem(key, JSON.stringify(prefs));feedback.textContent = 'Préférences enregistrées dans ce navigateur.'; }
    catch (error) { feedback.textContent = 'Affichage appliqué ; mémorisation indisponible dans ce navigateur.'; }
  }
  sizes.forEach(function (b) { b.addEventListener('click', function () { prefs.size = b.getAttribute('data-display-size');save(); }); });
  machine.addEventListener('click', function () { prefs.machine = !prefs.machine;save(); });
  document.getElementById('display-reset').addEventListener('click', function () { prefs = { size: 'standard', machine: true, sleepMinutes: 5 };save(); });
  document.getElementById('display-sleep-delay').addEventListener('change', function () {
    var value = Number(this.value); if ([0,1,2,5,10,30].indexOf(value) < 0) return;
    prefs.sleepMinutes = value; save();
  });
  document.getElementById('display-sleep-test').addEventListener('click', function () {
    if (window.cncScreenSaver) window.cncScreenSaver.preview();
  });
  function screenState() {
    document.getElementById('display-resolution').textContent = window.innerWidth + ' × ' + window.innerHeight;
    var active = !!document.fullscreenElement;
    fullscreen.textContent = active ? 'Quitter le plein écran' : 'Passer en plein écran';
    fullscreen.disabled = !active && (!document.fullscreenEnabled || !document.documentElement.requestFullscreen);
    document.getElementById('display-fullscreen-state').textContent = active ? 'Plein écran actif · Échap pour quitter.' : fullscreen.disabled ? 'Indisponible ici. Utilisez le mode plein écran du navigateur.' : 'Utiliser toute la surface disponible.';
  }
  fullscreen.addEventListener('click', function () {
    // Browser fullscreen requires this explicit user gesture; never restored automatically.
    var operation;
    try { operation = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    catch (error) { feedback.textContent = 'Le navigateur a refusé le plein écran.';return; }
    Promise.resolve(operation).then(screenState, function () { feedback.textContent = 'Le navigateur a refusé le plein écran. Utilisez son menu d’affichage.';screenState(); });
  });
  document.addEventListener('fullscreenchange', screenState);
  window.addEventListener('resize', screenState);
  var entry = document.createElement('button');entry.type = 'button';entry.id = 'ks-machine-display';entry.className = 'ks-secondary';entry.textContent = 'Réglages d’affichage →';
  document.querySelector('.ks-machine-overview').appendChild(entry);
  apply();screenState();
})();
