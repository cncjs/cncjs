(function () {
  'use strict';
  var simulation = document.body.getAttribute('data-simulation') === 'true';
  var panel = document.createElement('section');
  panel.id = 'screen-limits';
  panel.className = 'screen';
  panel.innerHTML = '<div class="card wide ks-panel-intro"><div><h2>Limites de la machine</h2><p id="limits-source" role="status"></p></div><span class="ks-readonly">Lecture seule</span></div>' +
    '<div class="card wide ks-limits-card"><table class="ks-limits-table"><thead><tr><th scope="col">Paramètre</th><th scope="col">X</th><th scope="col">Y</th><th scope="col">Z</th></tr></thead><tbody></tbody></table></div>' +
    '<div class="card wide ks-limit-protections"></div><p class="wide ks-help" id="limits-note"></p>';
  document.querySelector('main').appendChild(panel);
  var values = {}, flags = {};
  [[110, 'Vitesse maximale', 'mm/min'], [120, 'Accélération', 'mm/s²'], [130, 'Course maximale', 'mm']].forEach(function (row) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<th scope="row">' + row[1] + '<small>' + row[2] + '</small></th>';
    for (var i = 0; i < 3; i++) {
      var td = document.createElement('td'), key = '$' + (row[0] + i);
      td.innerHTML = '<b>—</b><small>' + key + '</small>';
      values[key] = td.querySelector('b');
      tr.appendChild(td);
    }
    panel.querySelector('tbody').appendChild(tr);
  });
  [[20, 'Limites logicielles'], [21, 'Fins de course'], [22, 'Référencement']].forEach(function (row) {
    var item = document.createElement('div'), key = '$' + row[0];
    item.innerHTML = '<span>' + row[1] + ' <small>' + key + '</small></span><b>Indisponible</b>';
    flags[key] = item.querySelector('b');
    panel.querySelector('.ks-limit-protections').appendChild(item);
  });
  var source = document.getElementById('limits-source'), note = document.getElementById('limits-note');
  var button = document.createElement('button');
  button.id = 'ks-machine-limits';button.className = 'ks-secondary ks-limits-link';button.type = 'button';
  button.textContent = 'Limites de la machine →';
  document.querySelector('.ks-machine-overview').appendChild(button);
  var port = null;
  function text(el,value){if(el.textContent!==value)el.textContent=value;}
  var lastSignature='';
  function clear(message) {
    port = null;
    lastSignature='';
    Object.keys(values).forEach(function (key) { text(values[key],'—'); });
    Object.keys(flags).forEach(function (key) { text(flags[key],'Indisponible'); if(flags[key].className!=='')flags[key].className = ''; });
    text(source,message);
    text(note,simulation ? 'Les déplacements fictifs ne modélisent ni vitesse, ni accélération, ni course physique.' : 'En attente des réglages transmis par CNCjs. Aucun réglage du contrôleur n’est modifié ici.');
  }
  clear(simulation ? 'Simulation · limites physiques non simulées' : 'Aucun réglage reçu du contrôleur');
  function receiveSettings(type,payload) {
    if (!port) return;
    if (type !== 'Grbl') { clear('Contrôleur non compatible avec les limites Grbl');return; }
    var settings=payload&&payload.settings||{}, signature=JSON.stringify([port,settings]);
    if(signature===lastSignature)return;lastSignature=signature;
    var count=0;
    Object.keys(values).forEach(function(key){
      var raw=settings[key],n=(typeof raw==='number'||typeof raw==='string'&&raw.trim()!=='')?Number(raw):NaN;
      var valid=isFinite(n)&&n>0;
      text(values[key],valid?n.toLocaleString('fr-FR',{maximumFractionDigits:3}):'—');if(valid)count++;
    });
    Object.keys(flags).forEach(function(key){
      var raw=settings[key],on=raw==='1'||raw===1,off=raw==='0'||raw===0;
      text(flags[key],on?'Activé':off?'Désactivé':'Indisponible');
      var name=on?'ks-limit-on':off?'ks-limit-off':'';if(flags[key].className!==name)flags[key].className=name;
      if(on||off)count++;
    });
    text(source,'Grbl · '+port+' · '+count+'/12 paramètres reçus');
    text(note,'Derniers réglages connus de CNCjs, reçus à '+new Date().toLocaleTimeString('fr-FR')+'. « — » : valeur absente ou invalide. Le référencement activé ne signifie pas que la machine est référencée.');
  }
  if(!simulation&&window.cncState){
    var unsubscribe=window.cncState.subscribe(function(state){
      var machine=state.machine;
      if(!machine||!machine.fresh){clear('Contrôleur sélectionné indisponible · valeurs inconnues');return;}
      if(port!==machine.port)clear('Grbl · en attente des réglages');
      port=machine.port;receiveSettings(machine.type,{settings:machine.settings});
    });
    var disposed=false;
    function dispose(){if(disposed)return;disposed=true;unsubscribe();window.removeEventListener('pagehide',onPageHide);}
    function onPageHide(event){if(!event||!event.persisted)dispose();}
    window.addEventListener('pagehide',onPageHide);
    window.cncMachineLimits={dispose:dispose};return;
  }
  if (simulation || !window.cncSocket) return;
  var socket = window.cncSocket;
  function unavailable() { clear('Connexion perdue · valeurs indisponibles'); }
  socket.on('disconnect', unavailable);
  socket.on('connect_error', unavailable);
  socket.on('error', unavailable);
  socket.on('serialport:open', function (data) {
    if (!socket.connected || !data || data.controllerType !== 'Grbl' || !data.port) {
      clear('Limites disponibles pour un contrôleur Grbl connecté');return;
    }
    if (port !== data.port) clear('Grbl · en attente des réglages');
    port = data.port;
  });
  socket.on('serialport:close', function (data) { if (!data || data.port === port) unavailable(); });
  socket.on('serialport:error', function (data) { if (!data || data.port === port) unavailable(); });
  socket.on('serialport:list', function (ports) {
    if (port && !(ports || []).some(function (p) { return p.port === port && p.inuse; })) unavailable();
    if (!(ports || []).some(function (p) { return p.inuse; })) clear('Aucune machine connectée · valeurs indisponibles');
  });
  socket.on('controller:settings', function (type, payload) {
    if (!port || !socket.connected) return;
    receiveSettings(type,payload);
  });
})();
