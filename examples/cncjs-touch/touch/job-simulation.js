(function () {
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  function elapsedClock(){return window.performance&&typeof window.performance.now==='function'?window.performance.now():Date.now();}
  var name='', file='', revision=0, workflow='idle', progress=0, started=false, ticket=null, ticketId=0, last=elapsedClock();
  var position={x:0,y:0,z:0},offset={x:0,y:0,z:0},alarm=false;
  var workFrames={G54:offset},wcs='G54',motionRevision=0;
  var history=[],eventId=0;
  var probeLocked=false;
  function log(action,message){
    history.unshift({id:++eventId,time:Date.now(),action:action,message:message,file:name,percent:Math.floor(progress)});
    if(history.length>100)history.length=100;
  }
  log('session',uiLocale.t('Session de simulation ouverte.'));
  function update() {
    var now=elapsedClock(),elapsed=now-last;
    // A backward fallback-clock jump must neither reverse progress nor extend a ticket.
    if(elapsed<0){elapsed=0;ticket=null;}
    if(workflow==='running') {
      progress=Math.min(100,progress+elapsed/600);
      if(progress>=100) {workflow='idle';log('complete',uiLocale.t('Travail fictif terminé.'));}
    }
    last=now;
  }
  function snapshot() {
    return {port:'SIMULATION',type:'Virtuel',activeState:alarm?'Alarm':workflow==='running'?'Run':workflow==='paused'?'Hold':'Idle',
      workflow:workflow,fresh:true,name:file,originalName:name,revision:revision,total:100,received:progress,
      remainingSeconds:file?Math.max(0,(100-progress)*0.6):null,
      history:history.map(function(e){return {id:e.id,time:e.time,action:e.action,message:e.message,file:e.file,percent:e.percent};}),
      wcs:wcs,motionRevision:motionRevision,
      machinePosition:{x:position.x,y:position.y,z:position.z},
      workPosition:{x:position.x-offset.x,y:position.y-offset.y,z:position.z-offset.z},
      probeBusy:probeLocked,canJog:!probeLocked&&!alarm&&workflow==='idle',
      canLoad:!probeLocked&&!alarm&&workflow==='idle',canStart:!probeLocked&&!alarm&&!!file&&!started,canResume:!probeLocked&&!alarm&&workflow==='paused',
      canPause:workflow==='running',canStop:workflow!=='idle',
      loadReason:probeLocked?uiLocale.t('Palpage simulé en cours : autres commandes bloquées.'):alarm?uiLocale.t('Alarme simulée : voir l’onglet Machine.'):workflow!=='idle'?uiLocale.t('Arrêtez la simulation avant de charger un autre fichier.'):'',
      startReason:alarm?uiLocale.t('Alarme simulée : voir l’onglet Machine.'):progress>=100?uiLocale.t('Simulation terminée. Rechargez le fichier pour recommencer.'):uiLocale.t('Rechargez le fichier pour recommencer.'),resumeReason:alarm?uiLocale.t('Alarme simulée : voir l’onglet Machine.'):''};
  }
  window.cncJobSimulation={request:function(method,body) {
    return new Promise(function(resolve,reject) {
      try {
        update();
        if(method==='GET') {resolve({controllers:[snapshot()]});return;}
        var a=body.action, state=snapshot();
        if(body.port!=='SIMULATION') throw new Error(uiLocale.t('Contrôleur virtuel uniquement.'));
        if(a==='simulate-alarm'||a==='clear-simulated-alarm') {
          alarm=a==='simulate-alarm';ticket=null;
          if(alarm&&workflow==='running')workflow='paused';
          var alarmMessage=alarm?uiLocale.t('Alarme fictive déclenchée. ')+(workflow==='paused'?uiLocale.t('Travail suspendu. '):'')+uiLocale.t('Commandes bloquées.'):uiLocale.t('Alarme fictive effacée. Aucun démarrage automatique ; confirmez la reprise si le travail est en pause.');
          if(alarm&&probeLocked)window.dispatchEvent(new CustomEvent('cnc-probe-interrupt'));
          log(a,alarmMessage);resolve({message:alarmMessage});return;
        } else if(a==='coordinate'||a==='select-wcs') {
          if(!state.canJog)throw new Error(uiLocale.t('Travail, alarme ou palpage : coordonnées bloquées.'));
          if(body.motionRevision!==motionRevision)throw new Error(uiLocale.t('Les coordonnées ont changé. Recalculez la préparation.'));
          var model=window.CNCCoordinates;
          if(!model)throw new Error(uiLocale.t('Calculateur indisponible.'));
          if(a==='select-wcs'){
            if(model.frames.indexOf(body.wcs)<0)throw new Error(uiLocale.t('Repère invalide.'));
            wcs=body.wcs;offset=workFrames[wcs]||(workFrames[wcs]={x:0,y:0,z:0});
          }else{
            var prepared=model.plan(state,body);
            if(prepared.operation==='set')offset[prepared.axis]=prepared.offsetMm;
            else position[prepared.axis]=prepared.targetMachineMm;
          }
          motionRevision++;ticket=null;
          var message=a==='select-wcs'?uiLocale.t('Repère fictif ')+wcs+uiLocale.t(' sélectionné.'):
            (prepared.operation==='set'?uiLocale.t('Coordonnée définie sans déplacement : '):uiLocale.t('Position fictive atteinte : '))+prepared.axis.toUpperCase()+' '+prepared.targetWorkMm+' mm · '+wcs+'.';
          log(a,message);resolve({message:uiLocale.t('SIMULATION — ')+message});return;
        } else if(a==='jog'||a==='zero'||a==='reset-position') {
          if(!state.canJog)throw new Error(uiLocale.t('Arrêtez le travail simulé avant de déplacer les axes ou modifier l’origine.'));
          if(a==='jog') {
            if(['x','y','z'].indexOf(body.axis)<0||[0.1,1,10].indexOf(body.step)<0||[1,-1].indexOf(body.direction)<0)throw new Error(uiLocale.t('Déplacement simulé invalide.'));
            position[body.axis]=Math.round((position[body.axis]+body.step*body.direction)*1000)/1000;
          } else if(a==='zero') {
            if(['x','y','z','xyz'].indexOf(body.axis)<0)throw new Error(uiLocale.t('Axe invalide.'));
            ['x','y','z'].forEach(function(axis){if(body.axis==='xyz'||body.axis===axis)offset[axis]=position[axis];});
          } else {position={x:0,y:0,z:0};offset={x:0,y:0,z:0};workFrames={G54:offset};wcs='G54';}
          motionRevision++;
          ticket=null;
          log(a,a==='jog'?uiLocale.t('Déplacement ')+body.axis.toUpperCase()+' : '+(body.step*body.direction)+' mm.':a==='zero'?uiLocale.t('Origine ')+body.axis.toUpperCase()+uiLocale.t(' mise à zéro.'):uiLocale.t('Coordonnées fictives réinitialisées.'));
          resolve({message:uiLocale.t('SIMULATION — ')+(a==='jog'?uiLocale.t('Déplacement fictif effectué.'):a==='zero'?uiLocale.t('Origine de travail fictive mise à zéro, sans déplacement.'):uiLocale.t('Coordonnées fictives réinitialisées.'))});return;
        } else if(a==='load') {
          if(!state.canLoad||!body.file) throw new Error(uiLocale.t('Chargement simulé indisponible.'));
          file=body.file;name=file.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/,'');
          revision++;progress=0;started=false;ticket=null;
        } else if(a==='prepare') {
          if(body.revision!==revision || !(body.operation==='start'?state.canStart:body.operation==='resume'&&state.canResume)) throw new Error(uiLocale.t('Action simulée indisponible.'));
          ticket={nonce:String(++ticketId)+'-'+revision,operation:body.operation,expires:elapsedClock()+15000};
          resolve({nonce:ticket.nonce,name:name,expiresIn:15});return;
        } else if(a==='start'||a==='resume') {
          var t=ticket;ticket=null;
          if(!t||t.nonce!==body.nonce||t.operation!==a||elapsedClock()>=t.expires||!(a==='start'?state.canStart:state.canResume)) throw new Error(uiLocale.t('Confirmation simulée expirée ou invalide.'));
          workflow='running';started=true;
        } else if(a==='pause') {
          if(!state.canPause) throw new Error(uiLocale.t('Aucune simulation en cours.'));
          workflow='paused';ticket=null;
        } else if(a==='stop') {
          workflow='idle';ticket=null;started=true;
        } else throw new Error(uiLocale.t('Action simulée inconnue.'));
        var message=({load:uiLocale.t('Fichier sélectionné pour le test ; aucun G-code exécuté.'),start:uiLocale.t('Démarrage fictif.'),resume:uiLocale.t('Reprise fictive.'),pause:uiLocale.t('Pause fictive.'),stop:uiLocale.t('Travail fictif arrêté.')}[a]);
        log(a,message);resolve({message:uiLocale.t('SIMULATION — ')+message});
      } catch(e) {if(method!=='GET')log('rejected',uiLocale.t('Action refusée : ')+e.message);reject(e);}
    });
  }};
  window.cncJobSimulation.acquireProbe=function(){
    update();
    if(probeLocked||alarm||workflow!=='idle'||(ticket&&elapsedClock()<ticket.expires))throw new Error(uiLocale.t('Un travail, une confirmation ou une alarme bloque le palpage fictif.'));
    probeLocked=true;ticket=null;log('probe-lock',uiLocale.t('Banc de palpage fictif ouvert ; autres commandes bloquées.'));
  };
  window.cncJobSimulation.releaseProbe=function(){if(probeLocked){probeLocked=false;log('probe-unlock',uiLocale.t('Banc de palpage fictif terminé.'));}};
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click',function(){
      var target=tab.getAttribute('data-screen');
      document.querySelectorAll('.screen').forEach(function(s){s.classList.toggle('active',s.id==='screen-'+target);});
      document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t===tab);});
    });
  });
})();
