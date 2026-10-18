(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var panel = document.querySelector('.library-execution');
  if (!panel) return;
  var simulation=window.cncJobSimulation;
  var networkOffline=!simulation&&!!(window.navigator&&window.navigator.onLine===false);
  panel.innerHTML = uiLocale.html('<h2>Exécution sur la machine</h2>') +
    uiLocale.html('<label for="job-port">Contrôleur CNCjs</label><select id="job-port"><option value="">Aucune machine connectée</option></select>') +
    uiLocale.html('<p id="job-state" role="status">Lecture de l’état…</p>') +
    uiLocale.html('<p id="job-selected"></p><p id="job-loaded">Aucun fichier chargé.</p><p id="job-reason" role="status"></p><progress id="job-progress" max="100" value="0"></progress>') +
    uiLocale.html('<div class="job-buttons"><button id="job-load" disabled>Charger le fichier sélectionné</button>') +
    uiLocale.html('<button id="job-start" class="job-start" disabled>Démarrer…</button><button id="job-pause" disabled>Pause</button>') +
    uiLocale.html('<button id="job-resume" disabled>Reprendre…</button><button id="job-stop" class="job-stop" disabled>Arrêter le travail</button></div>') +
    uiLocale.html('<p id="job-feedback" role="status">Le chargement ne démarre pas le travail.</p>') +
    uiLocale.html('<p class="mute">L’arrêt logiciel ne remplace pas l’arrêt physique de la machine.</p>') +
    uiLocale.html('<div id="job-dialog" class="job-dialog" role="dialog" aria-modal="true" aria-labelledby="job-dialog-title" hidden>') +
    uiLocale.html('<div class="job-dialog-card"><h2 id="job-dialog-title">Confirmer le démarrage</h2><p id="job-dialog-file"></p><p id="job-travel" class="job-travel" hidden></p><p id="job-note" class="job-note" hidden></p>') +
    uiLocale.html('<p>')+(simulation?uiLocale.t('Test des boutons uniquement. Aucun mouvement ni activation du laser.'):uiLocale.t('Cette action met la machine en mouvement et peut activer l’outil. Vérifiez la machine, l’origine et la zone de travail.'))+uiLocale.html('</p>') +
    uiLocale.html('<label class="job-confirm-label"><input id="job-check" type="checkbox">')+(simulation?uiLocale.t('Je souhaite lancer cette simulation.'):uiLocale.t('Je suis devant la machine et prêt à lancer ce fichier.'))+uiLocale.html('</label>') +
    uiLocale.html('<p id="job-countdown"></p><button id="job-confirm" disabled>Confirmer</button><button id="job-dismiss">Annuler</button></div></div>');
  var $ = function(id) {return document.getElementById(id);};
  // The confirmation must remain visible when opened from the home screen.
  document.body.appendChild($('job-dialog'));
  var selection=window.cncLibrarySelection||null, machines=[], current=null, busy=false, polling=false, lastSeen=0, ticket=null, until=0, portSignature='';
  var store=window.cncState, compact=!!(store&&window.CNCJobStream), stream=null, transportId=null, epoch='', serverSequence=0;
  var generation=0, mutation=0, confirmation=0, pending=0, commandSequence=0, feedbackSequence=0, nextPoll=0, disposed=false, stateSignature='', streamReason='';
  var latestMachine=null, lastTransit=0, appliedRequest=0, requestSequence=0, requests=[], bindings=[], explicitPort=false, protocolReady=false;
  var dialogReturn=null,dialogBackground=[], observationSuspended=!!document.hidden, preparing=0;
  function bind(target,name,fn){target.addEventListener(name,fn);bindings.push(function(){if(target.removeEventListener)target.removeEventListener(name,fn);});}
  function text(id,value){if(window.cncI18n&&(id==='job-feedback'||id==='job-reason'||id==='job-state'))value=window.cncI18n.message(value);var node=$(id);if(node&&node.textContent!==String(value))node.textContent=String(value);}
  function prop(id,name,value){var node=$(id);if(node&&node[name]!==value)node[name]=value;}
  function token(){try{return JSON.parse(localStorage.getItem('cnc')).state.session.token||'';}catch(_){return '';}}
  function elapsedClock(){return window.performance&&typeof window.performance.now==='function'?window.performance.now():Date.now();}
  function api(method,body) {
    if(simulation) return simulation.request(method,body);
    if(networkOffline)return Promise.reject(new Error(uiLocale.t('Réseau indisponible. Suivi suspendu ; aucune commande ne sera relancée automatiquement.')));
    if(document.body && document.body.getAttribute('data-simulation')==='true') return Promise.reject(new Error(uiLocale.t('Simulateur indisponible. Rechargez la page.')));
    return new Promise(function(resolve,reject) {
      var credential=token();
      if (!credential) {reject(new Error(uiLocale.t('Session CNCjs requise.')));return;}
      var xhr=new XMLHttpRequest(); requests.push(xhr); xhr.open(method,(store?store.get().apiBase:'/api')+'/touch-job',true); xhr.timeout=30000;
      xhr.setRequestHeader('Authorization','Bearer '+credential);
      function done(){var i=requests.indexOf(xhr);if(i>=0)requests.splice(i,1);}
      if(body) xhr.setRequestHeader('Content-Type','application/json');
      xhr.onload=function(){done();var data;try{data=JSON.parse(xhr.responseText);}catch(_){data={};}
        if(xhr.status>=200&&xhr.status<300) resolve(data);
        else reject(new Error(data.message || uiLocale.t('Commandes indisponibles (HTTP ')+xhr.status+').'));};
      xhr.onerror=xhr.ontimeout=function(){done();reject(new Error(uiLocale.t('Connexion perdue ou réponse incertaine. Vérifiez l’état avant toute nouvelle action.')));};
      xhr.send(body?JSON.stringify(body):null);
    });
  }
  function dismiss(restore) {
    confirmation++;ticket=null;prop('job-dialog','hidden',true);prop('job-check','checked',false);prop('job-confirm','disabled',true);
    dialogBackground.forEach(function(entry){entry.node.inert=entry.inert;});dialogBackground=[];
    var target=dialogReturn;dialogReturn=null;
    if(restore!==false&&!document.hidden&&target&&target.isConnected&&!target.disabled&&target.getClientRects().length)target.focus({preventScroll:true});
  }
  // Whether the machine state still allows what a ticket was issued for.
  // Commissioning commands confirmed through the same dialog (no loaded program involved).
  var COMMANDS={unlock:'canUnlock',home:'canHome',spindle:'canSpindleTest',zeroZ:'canZeroZ'};
  function standalone(operation){return operation==='macro'||Object.prototype.hasOwnProperty.call(COMMANDS,operation);}
  function ticketAllowed(t,state){
    if(t.operation==='macro')return !!state.canMacro;
    if(Object.prototype.hasOwnProperty.call(COMMANDS,t.operation))return !!state[COMMANDS[t.operation]];
    if(state.revision!==t.revision)return false;
    return t.operation==='start'?!!state.canStart:!!state.canResume;
  }
  function confirmable(){
    var state=projected();
    return !!ticket&&!document.hidden&&elapsedClock()>=ticket.started&&elapsedClock()<until&&Date.now()-lastSeen>=0&&Date.now()-lastSeen<3000&&
      ticket.generation===generation&&state&&state.fresh&&state.port===ticket.port&&ticketAllowed(ticket,state);
  }
  function otherDialog(){
    return document.querySelectorAll&&Array.prototype.some.call(document.querySelectorAll('[role="dialog"]'),function(node){return node!==$('job-dialog')&&!node.hidden&&node.getClientRects().length;});
  }
  // rotating: the server renews the event stream (every minute); the machine
  // state stays shown, but confirmations bound to the old stream are void.
  function unavailable(reason,rotating){
    var dropped=!!ticket||preparing>0;generation++;mutation++;dismiss();transportId=null;
    if(!rotating){current=null;latestMachine=null;lastSeen=0;}
    streamReason=reason||'';
    if(dropped)text('job-feedback',uiLocale.t('Confirmation annulée : le suivi a été renouvelé. Touchez à nouveau le bouton.'));
    render();
  }
  function projected(){
    if(!latestMachine)return null;
    var elapsed=Math.max(0,Date.now()-lastSeen), next={};
    Object.keys(latestMachine).forEach(function(key){next[key]=latestMachine[key];});
    if(compact&&!simulation&&!protocolReady){next.fresh=false;next.canLoad=next.canStart=next.canResume=next.canPreviewMotion=false;next.loadReason=next.startReason=next.resumeReason=uiLocale.t('Module de suivi absent ou incompatible. Installez la version attendue avant de charger ou démarrer.');}
    else if(compact&&!simulation&&(!transportId||!stream||!stream.alive())){next.canLoad=next.canStart=next.canResume=next.canPreviewMotion=false;next.loadReason=next.startReason=next.resumeReason=uiLocale.t('Suivi continu interrompu. Lecture de secours ; attendez le rétablissement avant de charger ou confirmer.');}
    if(typeof next.statusAgeMs==='number'){
      next.statusAgeMs+=elapsed+lastTransit;
      if(next.statusAgeMs>2500){next.fresh=false;next.canLoad=next.canStart=next.canResume=next.canPreviewMotion=false;next.loadReason=next.startReason=next.resumeReason=uiLocale.t('État machine trop ancien : attendre un rapport récent.');}
    }
    if(next.probeInput){var p={};Object.keys(next.probeInput).forEach(function(key){p[key]=next.probeInput[key];});if(typeof p.ageMs==='number')p.ageMs+=elapsed+lastTransit;if(p.ageMs===null||p.ageMs>2500){p.fresh=false;p.state='unknown';}next.probeInput=p;}
    return next;
  }
  function render() {
    current=projected();
    var online=current && Date.now()-lastSeen<3000;
    var transportConnected=compact&&!simulation?!!transportId&&!!stream&&stream.alive():!!lastSeen&&Date.now()-lastSeen<3000;
    var detail={machine:online?current:null,observedAt:lastSeen,transportConnected:transportConnected,simulation:!!simulation,busy:busy,feedback:$('job-feedback').textContent};
    if(store)store.set({machine:detail.machine,controllerId:detail.machine?detail.machine.port:null,transportConnected:transportConnected,transportReason:streamReason});
    var signature=JSON.stringify(detail);
    if(signature!==stateSignature){stateSignature=signature;window.dispatchEvent(new CustomEvent('cnc-job-status',{detail:detail}));}
    var selectedText=selection?uiLocale.t('Sélectionné dans la bibliothèque : ')+selection.name:uiLocale.t('Aucun fichier sélectionné dans la bibliothèque.');
    var loadedText=online?(current.name?uiLocale.t('Chargé dans CNCjs : ')+(current.originalName||current.name):uiLocale.t('Aucun fichier chargé dans CNCjs.')):uiLocale.t('Fichier chargé : état indisponible.');
    var reason='';
    if(!online) reason=streamReason||uiLocale.t('Connectez le contrôleur dans CNCjs et attendez un état récent.');
    else if(/^alarm/i.test(current.activeState)) reason=simulation?uiLocale.t('Alarme fictive : ouvrez Machine pour terminer le test d’alarme. La reprise devra être confirmée.'):(window.CNCGrblHelp?window.CNCGrblHelp.text(window.CNCGrblHelp.alarm(current.alarmCode))+' ':'')+uiLocale.t('Chargement et démarrage bloqués : le contrôleur est en ALARM. Consultez le message d’alarme dans CNCjs et résolvez sa cause. Quand la machine sera prête (Idle), chargez le fichier puis touchez Démarrer.');
    else if(!current.fresh) reason=uiLocale.t('En attente d’un état récent du contrôleur.');
    else if(!current.name) reason=current.canLoad?(selection?uiLocale.t('Étape suivante : Charger le fichier sélectionné, puis Démarrer.'):uiLocale.t('Sélectionnez un fichier dans la bibliothèque.')):(current.loadReason||uiLocale.t('Chargement indisponible.'));
    else if(current.workflow==='paused') reason=current.canResume?uiLocale.t('Travail en pause. Touchez Reprendre pour confirmer la reprise.'):current.resumeReason;
    else if(current.workflow==='running') reason=uiLocale.t('Travail en cours.');
    else reason=current.canStart?uiLocale.t('Fichier chargé. Touchez Démarrer pour confirmer.'):current.startReason;
    text('job-selected',selectedText);
    text('job-loaded',loadedText);
    text('job-reason',reason);
    var homeFile=$('file');
    if(simulation) {loadedText=loadedText.replace(uiLocale.t('dans CNCjs'),uiLocale.t('dans le simulateur'));text('job-loaded',loadedText);}
    if(homeFile) text('file',(simulation?uiLocale.t('SIMULATION — '):'')+selectedText+' — '+loadedText+' '+reason);
    prop('job-port','disabled',busy);
    prop('job-load','disabled',busy || !online || !selection || !current.canLoad);
    prop('job-start','disabled',busy || !online || !current.canStart);
    prop('job-resume','disabled',busy || !online || !current.canResume);
    // Pause and stop stay available while another request is pending.
    prop('job-pause','disabled',!online || !current.canPause);
    prop('job-stop','disabled',!online || !current.canStop);
    if(!online){text('job-state',uiLocale.t('Machine non connectée ou état indisponible.'));prop('job-progress','value',0);if(ticket)dismiss();return;}
    text('job-state',current.port+' · '+current.activeState+' · '+({idle:uiLocale.t('au repos'),running:uiLocale.t('travail en cours'),paused:uiLocale.t('en pause')}[current.workflow]||current.workflow));
    prop('job-progress','value',current.total?Math.min(100,Math.round(current.received/current.total*100)):0);
    var label=(simulation?uiLocale.t('Progression fictive : '):uiLocale.t('Lignes acquittées : '))+$('job-progress').value+' %';
    if(!$('job-progress').getAttribute||$('job-progress').getAttribute('aria-label')!==label)$('job-progress').setAttribute('aria-label',label);
    $('job-start').title=current.canStart?'':uiLocale.t(reason); $('job-load').title=uiLocale.t(current.loadReason||'');
    if(ticket && (ticket.port!==current.port || !ticketAllowed(ticket,current))) dismiss();
  }
  function apply(data,transit) {
      if(disposed||networkOffline)return;
      if(!data||!Array.isArray(data.controllers)||(!simulation&&compact&&
        (data.version!==undefined||data.epoch!==undefined)&&!window.CNCJobStream.validSnapshot(data,false))){
        var invalid=uiLocale.t('Réponse de suivi invalide.');
        if(stream)stream.reconnect(invalid);else unavailable(invalid);
        return;
      }
      if(epoch&&!data.epoch)return;
      protocolReady=data.version===1&&typeof data.epoch==='string';
      if(data.epoch){
        if(epoch&&data.epoch!==epoch){generation++;dismiss();serverSequence=0;}
        if(data.epoch===epoch&&data.sequence<=serverSequence)return;
        epoch=data.epoch;serverSequence=data.sequence;
      }
      machines=data.controllers||[];lastSeen=Date.now();lastTransit=transit||0;
      var old=$('job-port').value, signature=machines.map(function(m){return m.port;}).join('|');
      if(signature!==portSignature){
        portSignature=signature;$('job-port').textContent='';
        var blank=document.createElement('option');blank.value='';blank.textContent=machines.length?uiLocale.t('Choisir une machine'):uiLocale.t('Aucune machine connectée');$('job-port').appendChild(blank);
        machines.forEach(function(m){var o=document.createElement('option');o.value=m.port;o.textContent=m.port+' · '+m.type;$('job-port').appendChild(o);});
        $('job-port').value=machines.some(function(m){return m.port===old;})&&(explicitPort||machines.length===1)?old:(machines.length===1?machines[0].port:'');
        if(!$('job-port').value)explicitPort=false;
      }
      var next=machines.filter(function(m){return m.port===$('job-port').value;})[0]||null;
      if(latestMachine&&(!next||latestMachine.port!==next.port||latestMachine.generation!==next.generation)){generation++;dismiss();}
      latestMachine=next;
      render();
  }
  function poll(force) {
    if(disposed||networkOffline||polling)return;
    if(!force&&!simulation&&(stream&&stream.alive()||Date.now()<nextPoll))return;
    polling=true;nextPoll=Date.now()+10000;
    var id=++requestSequence, ownGeneration=generation, ownMutation=mutation, started=Date.now();
    api('GET').then(function(data){
      if(disposed||ownGeneration!==generation||ownMutation!==mutation||id<appliedRequest)return;
      appliedRequest=id;apply(data,Date.now()-started);
    }).catch(function(e){if(ownGeneration===generation&&ownMutation===mutation){unavailable(e.message);text('job-state',e.message);}}).then(function(){polling=false;});
  }
  function run(action,extra) {
    if(!current || Date.now()-lastSeen>=3000)return Promise.reject(new Error('État indisponible.'));
    if(!simulation&&['prepare','start','resume','macro','override','unlock','home','spindle','readSettings'].indexOf(action)>=0&&(!current.generation||!transportId||!stream||!stream.alive()))return Promise.reject(new Error(uiLocale.t('Suivi continu interrompu. Nouvelle confirmation requise.')));
    var body={action:action,port:current.port};
    if(current.generation)body.generation=current.generation;
    if(transportId)body.transportId=transportId;
    Object.keys(extra||{}).forEach(function(k){body[k]=extra[k];});
    return api('POST',body);
  }
  function command(action,extra) {
    var id=++commandSequence, ownGeneration=generation, started=Date.now();mutation++;pending++;busy=true;render();
    function finish(){pending--;busy=pending>0;render();if(!stream||!stream.alive())poll(true);}
    return run(action,extra).then(function(data){
      if(ownGeneration===generation){
        if(id>=feedbackSequence){feedbackSequence=id;text('job-feedback',data.message||'');}
        if(data.snapshot)apply(data.snapshot,Date.now()-started);
      }
      return data;
    }).catch(function(e){if(ownGeneration===generation&&id>=feedbackSequence){feedbackSequence=id;text('job-feedback',e.message);}throw e;})
      .then(function(data){finish();return data;},function(e){finish();throw e;});
  }
  // operation: 'start' | 'resume' (the loaded program) | 'macro' (extra.macroId).
  function prepare(operation,extra) {
    if(busy||!current)return;
    var port=current.port,revision=current.revision, ownGeneration=generation, ownConfirmation=++confirmation, started=elapsedClock(),origin=document.activeElement;
    var request=operation==='macro'?{operation:'macro',macroId:extra&&extra.macroId}:standalone(operation)?{operation:operation}:{operation:operation,revision:revision};
    // Commands with parameters (the plate probe: thickness and search distance).
    if(standalone(operation)&&operation!=='macro'&&extra)Object.keys(extra).forEach(function(k){request[k]=extra[k];});
    preparing++;
    command('prepare',request).then(function(data){
      preparing--;
      if(ownGeneration!==generation||ownConfirmation!==confirmation||document.hidden||!current||current.port!==port||(!standalone(operation)&&current.revision!==revision))return;
      until=started+Math.min(15,Number(data.expiresIn)||0)*1000;
      if(elapsedClock()<started||elapsedClock()>=until){text('job-feedback',uiLocale.t('Confirmation expirée. Préparez une nouvelle confirmation.'));return;}
      ticket={nonce:data.nonce,operation:operation,port:port,revision:revision,generation:generation,started:started};
      if(!confirmable()||otherDialog()){dismiss(false);return;}
      dialogReturn=origin;
      dialogBackground=Array.prototype.filter.call(document.body.children||[],function(node){return node!==$('job-dialog')&&!/^(SCRIPT|LINK|STYLE)$/.test(node.tagName);}).map(function(node){var entry={node:node,inert:node.inert};node.inert=true;return entry;});
      $('job-dialog-title').textContent=({start:uiLocale.t('Confirmer le démarrage'),macro:uiLocale.t('Exécuter la macro'),unlock:uiLocale.t('Déverrouiller la machine'),home:uiLocale.t('Lancer la prise d’origine'),spindle:uiLocale.t('Démarrer la broche'),zeroZ:uiLocale.t('Régler le zéro Z avec la plaque')})[operation]||uiLocale.t('Confirmer la reprise');
      $('job-dialog-file').textContent=data.name+' · '+port;
      // Start of a real job: is the program's XY extent inside the machine travel?
      if(window.CNCTravelCheck){var img=$('home-job-image'),pv=img&&img.cncPreview&&img.cncPreview.file===current.name?img.cncPreview:null;
        window.CNCTravelCheck.show($('job-travel'),operation==='start'&&!simulation?window.CNCTravelCheck.check(pv,current):null);}
      // Tool change resume or a resume from a line: what will happen, in one line.
      var note=window.CNCJobResume&&!simulation?window.CNCJobResume.dialogNote(operation,current):'';if($('job-note')){$('job-note').textContent=note;$('job-note').hidden=!note;}
      text('job-countdown',uiLocale.t('Confirmation valable ')+Math.max(0,Math.ceil((until-elapsedClock())/1000))+' s.');
      $('job-check').checked=false;$('job-confirm').disabled=true;$('job-dialog').hidden=false;$('job-dismiss').focus();
    },function(){preparing--;});
  }
  bind(window,'cnc-library-select',function(event){selection=event.detail;if(store)store.set({selection:selection});render();});
  bind($('job-port'),'change',function(){generation++;explicitPort=!!$('job-port').value;dismiss();latestMachine=machines.filter(function(m){return m.port===$('job-port').value;})[0]||null;render();});
  bind($('job-load'),'click',function(){if(!selection||busy)return;dismiss();command('load',{file:selection.file}).catch(function(){});});
  bind($('job-start'),'click',function(){prepare('start');});
  bind($('job-resume'),'click',function(){prepare('resume');});
  bind($('job-pause'),'click',function(){dismiss();command('pause').catch(function(){});});
  bind($('job-stop'),'click',function(){dismiss();command('stop').catch(function(){});});
  bind($('job-dismiss'),'click',dismiss);
  bind($('job-check'),'change',function(){$('job-confirm').disabled=!this.checked||!confirmable();});
  bind($('job-confirm'),'click',function(){
    if(!confirmable()){dismiss();return;}
    if(!$('job-check').checked)return;
    var t=ticket;dismiss();command(t.operation,{nonce:t.nonce}).then(function(){
      // Tells the commissioning assistant which confirmed command the server accepted.
      if(Object.prototype.hasOwnProperty.call(COMMANDS,t.operation))window.dispatchEvent(new CustomEvent('cnc-command-sent',{detail:t.operation}));
    }).catch(function(){});
  });
  bind(document,'keydown',function(e){
    if(e.key==='Escape'){var visible=!$('job-dialog').hidden;dismiss();if(visible){e.preventDefault();e.stopImmediatePropagation();}return;}
    if($('job-dialog').hidden||e.key!=='Tab')return;
    var first=$('job-check'),last=$('job-dismiss');
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    e.stopImmediatePropagation();
  });
  bind(document,'focusin',function(e){if(!$('job-dialog').hidden&&!$('job-dialog').contains(e.target))$('job-dismiss').focus();});
  bind(window,'cnc-screen-change',function(){dismiss(false);});
  function resumeObservation(){
    if(disposed)return;
    if(observationSuspended&&!simulation){
      observationSuspended=false;
      var reason=uiLocale.t('Retour à la page : attendre un nouvel état.');
      if(stream)stream.reconnect(reason,true);else unavailable(reason);
    }
    observationSuspended=false;
    poll(true);
  }
  bind(document,'visibilitychange',function(){if(document.hidden){observationSuspended=true;dismiss(false);}else resumeObservation();});
  function network(online){
    if(simulation||disposed||networkOffline===!online)return;
    networkOffline=!online;
    if(stream)stream.setOnline(online);
    else unavailable(uiLocale.t(online?'Réseau rétabli. Vérification du suivi ; nouvelle confirmation requise.':'Réseau indisponible. Suivi suspendu ; aucune commande ne sera relancée automatiquement.'));
    if(online){nextPoll=0;poll(true);}
  }
  bind(window,'offline',function(){network(false);});
  bind(window,'online',function(){network(true);});
  var interval=setInterval(function(){render();if(ticket){var now=elapsedClock(),left=Math.ceil((until-now)/1000);text('job-countdown',uiLocale.t('Confirmation valable ')+Math.max(0,left)+' s.');if(left<=0||now<ticket.started)dismiss();}if(!document.hidden)poll();},1000);
  if(compact&&!simulation){
    stream=window.CNCJobStream.create({apiBase:store.get().apiBase,token:token,
      onSnapshot:function(data){transportId=data.transportId;streamReason='';apply(data,data.transitMs);},
      onDisconnect:function(reason,rotating){unavailable(reason,rotating);},onStatus:function(reason){streamReason=reason;render();}});
  }
  if(!simulation&&!compact&&window.cncSocket){
    ['disconnect','connect_error','error'].forEach(function(name){var fn=function(){if(stream)stream.reconnect();else unavailable(uiLocale.t('Connexion interrompue. Nouvelle confirmation requise.'));};window.cncSocket.on(name,fn);bindings.push(function(){if(window.cncSocket.off)window.cncSocket.off(name,fn);});});
  }
  function dispose(){if(disposed)return;dismiss(false);disposed=true;if(typeof clearInterval==='function')clearInterval(interval);if(stream)stream.dispose();bindings.forEach(function(fn){fn();});requests.forEach(function(xhr){xhr.onload=xhr.onerror=xhr.ontimeout=null;xhr.abort();});requests=[];}
  bind(window,'pagehide',function(event){if(event&&event.persisted){observationSuspended=true;dismiss();if(stream)stream.reconnect();else unavailable(uiLocale.t('Retour à la page : attendre un nouvel état.'));}else dispose();});
  bind(window,'pageshow',function(event){if(event&&event.persisted)resumeObservation();});
  window.cncJobControls={refresh:function(){poll(true);},dispose:dispose,
    // Realtime override step (kind: feed | spindle | rapid; value as accepted by the server).
    override:function(kind,value){if(busy||!current)return Promise.reject(new Error(uiLocale.t('Opération en cours…')));return command('override',{kind:kind,value:value});},
    // Opens the confirmation for a CNCjs macro; the macro runs only after the confirmed nonce.
    prepareMacro:function(id){prepare('macro',{macroId:id});},
    // Commissioning: unlock ($X), home ($H) or spindle test (M3), each after the confirmation dialog.
    // Closes an open confirmation and drops a prepare still on its way.
    cancel:function(){dismiss(false);},
    prepareCommand:function(operation,extra){if(Object.prototype.hasOwnProperty.call(COMMANDS,operation))prepare(operation,extra);},
    spindleStop:function(){if(!current)return Promise.reject(new Error(uiLocale.t('État indisponible.')));return command('spindleStop');},
    // Resume from a line: what would be sent (nothing loaded), then the load itself.
    resumePlan:function(file,line){if(!current)return Promise.reject(new Error(uiLocale.t('État indisponible.')));return run('resumePlan',{file:file,line:line});},
    loadFrom:function(file,line){if(busy||!current)return Promise.reject(new Error(uiLocale.t('Opération en cours…')));return command('load',{file:file,fromLine:line});},
    readSettings:function(){if(busy||!current)return Promise.reject(new Error(uiLocale.t('Opération en cours…')));return command('readSettings');},
    // Full $$ list and firmware banner, read-only.
    settings:function(){if(!current)return Promise.reject(new Error(uiLocale.t('État indisponible.')));return run('settings');}};
  // Deferred subscribers can load after the first resolved local snapshot.
  bind(document,'DOMContentLoaded',function(){stateSignature='';render();});
  poll(true);
  if(!simulation) {
    var link=document.createElement('a');link.href='simulation.html';link.textContent=uiLocale.t('Ouvrir le mode SIMULATION (sans machine)');panel.insertBefore(link,panel.firstChild);
  }
})();

