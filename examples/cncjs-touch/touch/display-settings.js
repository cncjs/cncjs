(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var key = 'cncjs-touch-display-v1';
  var panel = document.getElementById('screen-settings');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'screen-settings';panel.className = 'screen';
    document.querySelector('main').appendChild(panel);
  }
  panel.innerHTML = uiLocale.html('<div class="card wide ks-panel-intro"><div><h2>Votre écran</h2><p>Préférences conservées dans ce navigateur.</p></div><span class="ks-readonly" id="display-resolution"></span></div>') +
    uiLocale.html('<div class="card ks-display-card"><h2>Taille du texte</h2><p>Choisissez le confort de lecture.</p><div class="ks-display-choices" role="group" aria-label="Taille du texte"><button type="button" data-display-size="standard" aria-pressed="true"><span class="ks-text-sample">Aa</span>Standard</button><button type="button" data-display-size="large" aria-pressed="false"><span class="ks-text-sample ks-text-large">Aa</span>Agrandi</button></div></div>') +
    uiLocale.html('<div class="card ks-display-card"><h2>Suivi du travail réel</h2><p>Coordonnées machine en plus des coordonnées de travail.</p><button type="button" id="display-machine-toggle" class="ks-display-toggle" aria-pressed="true"><span>Coordonnées machine</span><b id="display-machine-state">Affichées</b></button><p class="ks-help">Ce choix concerne le suivi réel. Les positions restent disponibles dans Déplacer / Origine.</p></div>') +
    uiLocale.html('<div class="card ks-display-card"><h2>Horloge</h2><p>Heure affichée dans l’en-tête.</p><button type="button" id="display-clock-toggle" class="ks-display-toggle" aria-pressed="true"><span>Heure dans l’en-tête</span><b id="display-clock-state">Affichée</b></button></div>') +
    uiLocale.html('<div class="card ks-display-fullscreen"><div><h2>Plein écran</h2><p id="display-fullscreen-state">Utiliser toute la surface disponible.</p></div><button type="button" id="display-fullscreen" class="ks-secondary">Passer en plein écran</button></div>') +
    uiLocale.html('<div class="card ks-display-sleep"><h2>Veille de l’écran</h2><label for="display-sleep-delay">Après une période sans interaction au repos</label><div class="ks-sleep-controls"><select id="display-sleep-delay"><option value="0">Jamais</option><option value="1">1 minute</option><option value="2">2 minutes</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="30">30 minutes</option></select><button id="display-sleep-test" type="button" class="ks-secondary" aria-describedby="display-sleep-status">Tester</button></div><p id="display-sleep-status" role="status"></p><p>Écran noir logiciel au repos. Un toucher réveille sans actionner les commandes.</p></div>') +
    uiLocale.html('<div class="wide ks-display-footer"><p id="display-feedback" role="status">Aucun réglage du contrôleur modifié.</p><button type="button" id="display-reset" class="ks-secondary">Rétablir l’affichage</button></div>');
  var sizes = panel.querySelectorAll('[data-display-size]');
  var machine = document.getElementById('display-machine-toggle');
  var clock = document.getElementById('display-clock-toggle');
  var feedback = document.getElementById('display-feedback');
  var fullscreen = document.getElementById('display-fullscreen');
  var prefs = { size: 'standard', machine: true, sleepMinutes: 5, clock: true };
  var savedRaw,storageRead=false,validStored=false;
  var invalidMessage=uiLocale.t('Préférences enregistrées illisibles. Mémorisation bloquée ; utilisez « Rétablir l’affichage » pour les remplacer.');
  try {
    savedRaw=localStorage.getItem(key);storageRead=true;
    var saved = savedRaw===null?null:JSON.parse(savedRaw);
    if(savedRaw!==null&&(!saved||typeof saved!=='object'||Array.isArray(saved)||
      !Object.keys(saved).every(function(k){return ['size','machine','sleepMinutes','clock'].indexOf(k)>=0;})||
      (saved.size!==undefined&&['standard','large'].indexOf(saved.size)<0)||
      (saved.machine!==undefined&&typeof saved.machine!=='boolean')||
      (saved.clock!==undefined&&typeof saved.clock!=='boolean')||
      (saved.sleepMinutes!==undefined&&[0,1,2,5,10,30].indexOf(saved.sleepMinutes)<0)))throw Error('invalid');
    if (saved) {
      prefs.size = saved.size === 'large' ? 'large' : 'standard';
      prefs.machine = saved.machine !== false;
      prefs.clock = saved.clock !== false;
      if ([0,1,2,5,10,30].indexOf(saved.sleepMinutes) >= 0) prefs.sleepMinutes = saved.sleepMinutes;
    }
    validStored=true;
  } catch (error) {feedback.textContent=storageRead?invalidMessage:uiLocale.t('Affichage appliqué ; mémorisation indisponible dans ce navigateur.');}
  var home = document.getElementById('screen-home');
  var card = home ? home.querySelector('#mx') : null;
  while (card && card !== home && !card.classList.contains('card')) card = card.parentElement;
  if (card && card !== home) card.classList.add('home-machine-coordinates');
  function apply() {
    document.body.classList.toggle('display-large', prefs.size === 'large');
    document.body.classList.toggle('display-hide-machine', !prefs.machine);
    document.body.classList.toggle('display-hide-clock', !prefs.clock);
    sizes.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-display-size') === prefs.size)); });
    machine.setAttribute('aria-pressed', String(prefs.machine));
    document.getElementById('display-machine-state').textContent = prefs.machine ? uiLocale.t('Affichées') : uiLocale.t('Masquées');
    clock.setAttribute('aria-pressed', String(prefs.clock));
    document.getElementById('display-clock-state').textContent = prefs.clock ? uiLocale.t('Affichée') : uiLocale.t('Masquée');
    if (window.cncHeaderClock) window.cncHeaderClock.tick();
    document.getElementById('display-sleep-delay').value = String(prefs.sleepMinutes);
    if (window.cncScreenSaver) window.cncScreenSaver.configure(prefs.sleepMinutes);
    window.dispatchEvent(new Event('resize'));
  }
  function save(reset) {
    apply();
    var failure=uiLocale.t('Affichage appliqué ; mémorisation indisponible dans ce navigateur.');
    try {
      if(!storageRead)throw Error('unreadable');
      if(localStorage.getItem(key)!==savedRaw){failure=uiLocale.t('Les préférences ont changé dans un autre onglet. Affichage appliqué ici uniquement ; rechargez au repos avant de les enregistrer.');throw Error('conflict');}
      if(!validStored&&!reset){failure=invalidMessage;throw Error('invalid');}
      var encoded=JSON.stringify(prefs);localStorage.setItem(key,encoded);
      if(localStorage.getItem(key)!==encoded){failure=uiLocale.t('La mémorisation de l’affichage n’a pas pu être confirmée. Les changements restent appliqués à cette page.');throw Error('unconfirmed');}
      savedRaw=encoded;validStored=true;feedback.textContent = uiLocale.t('Préférences enregistrées dans ce navigateur.');
    }
    catch (error) { feedback.textContent = failure; }
  }
  sizes.forEach(function (b) { b.addEventListener('click', function () { prefs.size = b.getAttribute('data-display-size');save(); }); });
  machine.addEventListener('click', function () { prefs.machine = !prefs.machine;save(); });
  clock.addEventListener('click', function () { prefs.clock = !prefs.clock;save(); });
  document.getElementById('display-reset').addEventListener('click', function () { prefs = { size: 'standard', machine: true, sleepMinutes: 5, clock: true };save(true); });
  document.getElementById('display-sleep-delay').addEventListener('change', function () {
    var value = Number(this.value); if ([0,1,2,5,10,30].indexOf(value) < 0) return;
    prefs.sleepMinutes = value; save();
  });
  document.getElementById('display-sleep-test').addEventListener('click', function () {
    if (window.cncScreenSaver && !window.cncScreenSaver.preview()) feedback.textContent = window.cncScreenSaver.status().reason || uiLocale.t('Fermez la fenêtre ouverte avant de tester la veille.');
  });
  function sleepStatus() {
    var state = window.cncScreenSaver ? window.cncScreenSaver.status() : { blocked: true, reason: uiLocale.t('Veille indisponible.') };
    var test = document.getElementById('display-sleep-test'), label = document.getElementById('display-sleep-status');
    var text = state.reason || uiLocale.t('Pendant un travail ou une pause, l’écran reste allumé.');
    if (test.disabled !== state.blocked) test.disabled = state.blocked;
    if (label.textContent !== text) label.textContent = text;
  }
  window.addEventListener('cnc-screen-saver-status', sleepStatus);
  function screenState() {
    document.getElementById('display-resolution').textContent = window.innerWidth + ' × ' + window.innerHeight;
    var active = !!document.fullscreenElement;
    fullscreen.textContent = active ? uiLocale.t('Quitter le plein écran') : uiLocale.t('Passer en plein écran');
    fullscreen.disabled = !active && (!document.fullscreenEnabled || !document.documentElement.requestFullscreen);
    document.getElementById('display-fullscreen-state').textContent = active ? uiLocale.t('Plein écran actif · Échap pour quitter.') : fullscreen.disabled ? uiLocale.t('Indisponible ici. Utilisez le mode plein écran du navigateur.') : uiLocale.t('Utiliser toute la surface disponible.');
  }
  fullscreen.addEventListener('click', function () {
    // Browser fullscreen requires this explicit user gesture; never restored automatically.
    var operation;
    try { operation = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    catch (error) { feedback.textContent = uiLocale.t('Le navigateur a refusé le plein écran.');return; }
    Promise.resolve(operation).then(screenState, function () { feedback.textContent = uiLocale.t('Le navigateur a refusé le plein écran. Utilisez son menu d’affichage.');screenState(); });
  });
  document.addEventListener('fullscreenchange', screenState);
  window.addEventListener('resize', screenState);
  var entry = document.createElement('button');entry.type = 'button';entry.id = 'ks-machine-display';entry.className = 'ks-secondary';entry.textContent = uiLocale.t('Réglages d’affichage →');
  document.querySelector('.ks-machine-overview').appendChild(entry);
  apply();screenState();sleepStatus();
})();
