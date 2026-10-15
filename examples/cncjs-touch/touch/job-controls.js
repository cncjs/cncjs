(function () {
  'use strict';
  var panel = document.querySelector('.library-execution');
  if (!panel) return;
  var simulation=window.cncJobSimulation;
  panel.innerHTML = '<h2>Exécution sur la machine</h2>' +
    '<label for="job-port">Contrôleur CNCjs</label><select id="job-port"><option value="">Aucune machine connectée</option></select>' +
    '<p id="job-state" role="status">Lecture de l’état…</p>' +
    '<p id="job-selected"></p><p id="job-loaded">Aucun fichier chargé.</p><p id="job-reason" role="status"></p><progress id="job-progress" max="100" value="0"></progress>' +
    '<div class="job-buttons"><button id="job-load" disabled>Charger le fichier sélectionné</button>' +
    '<button id="job-start" class="job-start" disabled>Démarrer…</button><button id="job-pause" disabled>Pause</button>' +
    '<button id="job-resume" disabled>Reprendre…</button><button id="job-stop" class="job-stop" disabled>Arrêter le travail</button></div>' +
    '<p id="job-feedback" role="status">Le chargement ne démarre pas le travail.</p>' +
    '<p class="mute">L’arrêt logiciel ne remplace pas l’arrêt physique de la machine.</p>' +
    '<div id="job-dialog" class="job-dialog" role="dialog" aria-modal="true" aria-labelledby="job-dialog-title" hidden>' +
    '<div class="job-dialog-card"><h2 id="job-dialog-title">Confirmer le démarrage</h2><p id="job-dialog-file"></p>' +
    '<p>'+(simulation?'Test des boutons uniquement. Aucun mouvement ni activation du laser.':'Cette action met la machine en mouvement et peut activer l’outil. Vérifiez la machine, l’origine et la zone de travail.')+'</p>' +
    '<label class="job-confirm-label"><input id="job-check" type="checkbox">'+(simulation?'Je souhaite lancer cette simulation.':'Je suis devant la machine et prêt à lancer ce fichier.')+'</label>' +
    '<p id="job-countdown"></p><button id="job-confirm" disabled>Confirmer</button><button id="job-dismiss">Annuler</button></div></div>';
  var $ = function(id) {return document.getElementById(id);};
  // The confirmation must remain visible when opened from the home screen.
  document.body.appendChild($('job-dialog'));
  var selection=window.cncLibrarySelection||null, machines=[], current=null, busy=false, polling=false, lastSeen=0, ticket=null, until=0, portSignature='';
  var store=window.cncState, compact=!!(store&&window.CNCJobStream), stream=null, transportId=null, epoch='', serverSequence=0;
  var generation=0, mutation=0, confirmation=0, pending=0, commandSequence=0, feedbackSequence=0, nextPoll=0, disposed=false, stateSignature='', streamReason='';
  var latestMachine=null, lastTransit=0, appliedRequest=0, requestSequence=0, requests=[], bindings=[], explicitPort=false, protocolReady=false;
  function bind(target,name,fn){target.addEventListener(name,fn);bindings.push(function(){if(target.removeEventListener)target.removeEventListener(name,fn);});}
  function text(id,value){var node=$(id);if(node&&node.textContent!==String(value))node.textContent=String(value);}
  function prop(id,name,value){var node=$(id);if(node&&node[name]!==value)node[name]=value;}
  function token(){try{return JSON.parse(localStorage.getItem('cnc')).state.session.token||'';}catch(_){return '';}}
  function api(method,body) {
    if(simulation) return simulation.request(method,body);
    if(document.body && document.body.getAttribute('data-simulation')==='true') return Promise.reject(new Error('Simulateur indisponible. Rechargez la page.'));
    return new Promise(function(resolve,reject) {
      var credential=token();
      if (!credential) {reject(new Error('Session CNCjs requise.'));return;}
      var xhr=new XMLHttpRequest(); requests.push(xhr); xhr.open(method,(store?store.get().apiBase:'/api')+'/touch-job',true); xhr.timeout=30000;
      xhr.setRequestHeader('Authorization','Bearer '+credential);
      function done(){var i=requests.indexOf(xhr);if(i>=0)requests.splice(i,1);}
      if(body) xhr.setRequestHeader('Content-Type','application/json');
      xhr.onload=function(){done();var data;try{data=JSON.parse(xhr.responseText);}catch(_){data={};}
        if(xhr.status>=200&&xhr.status<300) resolve(data);
        else reject(new Error(data.message || 'Commandes indisponibles (HTTP '+xhr.status+').'));};
      xhr.onerror=xhr.ontimeout=function(){done();reject(new Error('Connexion perdue ou réponse incertaine. Vérifiez l’état avant toute nouvelle action.'));};
      xhr.send(body?JSON.stringify(body):null);
    });
  }
  function dismiss() {confirmation++;ticket=null;prop('job-dialog','hidden',true);prop('job-check','checked',false);}
  function unavailable(reason){generation++;mutation++;dismiss();transportId=null;current=null;latestMachine=null;lastSeen=0;streamReason=reason||'';render();}
  function projected(){
    if(!latestMachine)return null;
    var elapsed=Math.max(0,Date.now()-lastSeen), next={};
    Object.keys(latestMachine).forEach(function(key){next[key]=latestMachine[key];});
    if(compact&&!simulation&&!protocolReady){next.fresh=false;next.canLoad=next.canStart=next.canResume=next.canPreviewMotion=false;next.loadReason=next.startReason=next.resumeReason='Module de suivi absent ou incompatible. Installez la version attendue avant de charger ou démarrer.';}
    else if(compact&&!simulation&&(!transportId||!stream||!stream.alive())){next.canLoad=next.canStart=next.canResume=next.canPreviewMotion=false;next.loadReason=next.startReason=next.resumeReason='Suivi continu interrompu. Lecture de secours ; attendez le rétablissement avant de charger ou confirmer.';}
    if(typeof next.statusAgeMs==='number'){
      next.statusAgeMs+=elapsed+lastTransit;
      if(next.statusAgeMs>2500){next.fresh=false;next.canLoad=next.canStart=next.canResume=next.canPreviewMotion=false;next.loadReason=next.startReason=next.resumeReason='État machine trop ancien : attendre un rapport récent.';}
    }
    if(next.probeInput){var p={};Object.keys(next.probeInput).forEach(function(key){p[key]=next.probeInput[key];});if(typeof p.ageMs==='number')p.ageMs+=elapsed+lastTransit;if(p.ageMs===null||p.ageMs>2500){p.fresh=false;p.state='unknown';}next.probeInput=p;}
    return next;
  }
  function render() {
    current=projected();
    var online=current && Date.now()-lastSeen<3000;
    var transportConnected=compact&&!simulation?!!transportId&&!!stream&&stream.alive():!!lastSeen&&Date.now()-lastSeen<3000;
    var detail={machine:online?current:null,transportConnected:transportConnected,simulation:!!simulation,busy:busy,feedback:$('job-feedback').textContent};
    if(store)store.set({machine:detail.machine,controllerId:detail.machine?detail.machine.port:null,transportConnected:transportConnected,transportReason:streamReason});
    var signature=JSON.stringify(detail);
    if(signature!==stateSignature){stateSignature=signature;window.dispatchEvent(new CustomEvent('cnc-job-status',{detail:detail}));}
    var selectedText=selection?'Sélectionné dans la bibliothèque : '+selection.name:'Aucun fichier sélectionné dans la bibliothèque.';
    var loadedText=online?(current.name?'Chargé dans CNCjs : '+(current.originalName||current.name):'Aucun fichier chargé dans CNCjs.'):'Fichier chargé : état indisponible.';
    var reason='';
    if(!online) reason=streamReason||'Connectez le contrôleur dans CNCjs et attendez un état récent.';
    else if(/^alarm/i.test(current.activeState)) reason=simulation?'Alarme fictive : ouvrez Machine pour terminer le test d’alarme. La reprise devra être confirmée.':'Chargement et démarrage bloqués : le contrôleur est en ALARM. Consultez le message d’alarme dans CNCjs et résolvez sa cause. Quand la machine sera prête (Idle), chargez le fichier puis touchez Démarrer.';
    else if(!current.fresh) reason='En attente d’un état récent du contrôleur.';
    else if(!current.name) reason=current.canLoad?(selection?'Étape suivante : Charger le fichier sélectionné, puis Démarrer.':'Sélectionnez un fichier dans la bibliothèque.'):(current.loadReason||'Chargement indisponible.');
    else if(current.workflow==='paused') reason=current.canResume?'Travail en pause. Touchez Reprendre pour confirmer la reprise.':current.resumeReason;
    else if(current.workflow==='running') reason='Travail en cours.';
    else reason=current.canStart?'Fichier chargé. Touchez Démarrer pour confirmer.':current.startReason;
    text('job-selected',selectedText);
    text('job-loaded',loadedText);
    text('job-reason',reason);
    var homeFile=$('file');
    if(simulation) {loadedText=loadedText.replace('dans CNCjs','dans le simulateur');text('job-loaded',loadedText);}
    if(homeFile) text('file',(simulation?'SIMULATION — ':'')+selectedText+' — '+loadedText+' '+reason);
    prop('job-port','disabled',busy);
    prop('job-load','disabled',busy || !online || !selection || !current.canLoad);
    prop('job-start','disabled',busy || !online || !current.canStart);
    prop('job-resume','disabled',busy || !online || !current.canResume);
    // Pause and stop stay available while another request is pending.
    prop('job-pause','disabled',!online || !current.canPause);
    prop('job-stop','disabled',!online || !current.canStop);
    if(!online){text('job-state','Machine non connectée ou état indisponible.');prop('job-progress','value',0);if(ticket)dismiss();return;}
    text('job-state',current.port+' · '+current.activeState+' · '+({idle:'au repos',running:'travail en cours',paused:'en pause'}[current.workflow]||current.workflow));
    prop('job-progress','value',current.total?Math.min(100,Math.round(current.received/current.total*100)):0);
    var label=(simulation?'Progression fictive : ':'Lignes acquittées : ')+$('job-progress').value+' %';
    if(!$('job-progress').getAttribute||$('job-progress').getAttribute('aria-label')!==label)$('job-progress').setAttribute('aria-label',label);
    $('job-start').title=current.canStart?'':reason; $('job-load').title=current.loadReason||'';
    if(ticket && (ticket.port!==current.port || ticket.revision!==current.revision || (ticket.operation==='start'?!current.canStart:!current.canResume))) dismiss();
  }
  function apply(data,transit) {
      if(disposed)return;
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
        var blank=document.createElement('option');blank.value='';blank.textContent=machines.length?'Choisir une machine':'Aucune machine connectée';$('job-port').appendChild(blank);
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
    if(disposed||polling)return;
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
    if(!simulation&&['prepare','start','resume'].indexOf(action)>=0&&(!current.generation||!transportId||!stream||!stream.alive()))return Promise.reject(new Error('Suivi continu interrompu. Nouvelle confirmation requise.'));
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
  function prepare(operation) {
    if(busy||!current)return;
    var port=current.port,revision=current.revision, ownGeneration=generation, ownConfirmation=++confirmation, started=Date.now();
    command('prepare',{operation:operation,revision:revision}).then(function(data){
      if(ownGeneration!==generation||ownConfirmation!==confirmation||document.hidden||!current||current.port!==port||current.revision!==revision)return;
      until=started+Math.min(15,Number(data.expiresIn)||0)*1000;
      if(Date.now()>=until){text('job-feedback','Confirmation expirée. Préparez une nouvelle confirmation.');return;}
      ticket={nonce:data.nonce,operation:operation,port:port,revision:revision};
      $('job-dialog-title').textContent=operation==='start'?'Confirmer le démarrage':'Confirmer la reprise';
      $('job-dialog-file').textContent=data.name+' · '+port;
      $('job-check').checked=false;$('job-confirm').disabled=true;$('job-dialog').hidden=false;$('job-dismiss').focus();
    }).catch(function(){});
  }
  bind(window,'cnc-library-select',function(event){selection=event.detail;if(store)store.set({selection:selection});render();});
  bind($('job-port'),'change',function(){generation++;explicitPort=!!$('job-port').value;dismiss();latestMachine=machines.filter(function(m){return m.port===$('job-port').value;})[0]||null;render();});
  bind($('job-load'),'click',function(){if(!selection||busy)return;dismiss();command('load',{file:selection.file}).catch(function(){});});
  bind($('job-start'),'click',function(){prepare('start');});
  bind($('job-resume'),'click',function(){prepare('resume');});
  bind($('job-pause'),'click',function(){dismiss();command('pause').catch(function(){});});
  bind($('job-stop'),'click',function(){dismiss();command('stop').catch(function(){});});
  bind($('job-dismiss'),'click',dismiss);
  bind($('job-check'),'change',function(){$('job-confirm').disabled=!this.checked||!ticket||Date.now()>=until;});
  bind($('job-confirm'),'click',function(){
    if(!ticket||!$('job-check').checked||Date.now()>=until)return;
    var t=ticket;dismiss();command(t.operation,{nonce:t.nonce}).catch(function(){});
  });
  bind(document,'keydown',function(e){if(e.key==='Escape')dismiss();});
  bind(document,'visibilitychange',function(){if(document.hidden){confirmation++;dismiss();}else poll(true);});
  var interval=setInterval(function(){render();if(ticket){var left=Math.ceil((until-Date.now())/1000);text('job-countdown','Confirmation valable '+Math.max(0,left)+' s.');if(left<=0)dismiss();}if(!document.hidden)poll();},1000);
  if(compact&&!simulation){
    stream=window.CNCJobStream.create({apiBase:store.get().apiBase,token:token,
      onSnapshot:function(data){transportId=data.transportId;streamReason='';apply(data,data.transitMs);},
      onDisconnect:function(reason){unavailable(reason);},onStatus:function(reason){streamReason=reason;render();}});
  }
  if(!simulation&&!compact&&window.cncSocket){
    ['disconnect','connect_error','error'].forEach(function(name){var fn=function(){if(stream)stream.reconnect();else unavailable('Connexion interrompue. Nouvelle confirmation requise.');};window.cncSocket.on(name,fn);bindings.push(function(){if(window.cncSocket.off)window.cncSocket.off(name,fn);});});
  }
  function dispose(){if(disposed)return;disposed=true;if(typeof clearInterval==='function')clearInterval(interval);if(stream)stream.dispose();bindings.forEach(function(fn){fn();});requests.forEach(function(xhr){xhr.onload=xhr.onerror=xhr.ontimeout=null;xhr.abort();});requests=[];}
  bind(window,'pagehide',function(event){if(event&&event.persisted){dismiss();if(stream)stream.reconnect();else unavailable('Retour à la page : attendre un nouvel état.');}else dispose();});
  bind(window,'pageshow',function(event){if(event&&event.persisted){render();poll(true);}});
  window.cncJobControls={refresh:function(){poll(true);},dispose:dispose};
  poll(true);
  if(!simulation) {
    var link=document.createElement('a');link.href='simulation.html';link.textContent='Ouvrir le mode SIMULATION (sans machine)';panel.insertBefore(link,panel.firstChild);
  }
})();

