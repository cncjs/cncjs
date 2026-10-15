(function () {
  'use strict';
  var name='', file='', revision=0, workflow='idle', progress=0, started=false, ticket=null, last=Date.now();
  var position={x:0,y:0,z:0},offset={x:0,y:0,z:0},alarm=false;
  var history=[],eventId=0;
  var probeLocked=false;
  function log(action,message){
    history.unshift({id:++eventId,time:Date.now(),action:action,message:message,file:name,percent:Math.floor(progress)});
    if(history.length>100)history.length=100;
  }
  log('session','Session de simulation ouverte.');
  function update() {
    var now=Date.now();
    if(workflow==='running') {
      progress=Math.min(100,progress+(now-last)/600);
      if(progress>=100) {workflow='idle';log('complete','Travail fictif terminé.');}
    }
    last=now;
  }
  function snapshot() {
    return {port:'SIMULATION',type:'Virtuel',activeState:alarm?'Alarm':workflow==='running'?'Run':workflow==='paused'?'Hold':'Idle',
      workflow:workflow,fresh:true,name:file,originalName:name,revision:revision,total:100,received:progress,
      remainingSeconds:file?Math.max(0,(100-progress)*0.6):null,
      history:history.map(function(e){return {id:e.id,time:e.time,action:e.action,message:e.message,file:e.file,percent:e.percent};}),
      machinePosition:{x:position.x,y:position.y,z:position.z},
      workPosition:{x:position.x-offset.x,y:position.y-offset.y,z:position.z-offset.z},
      probeBusy:probeLocked,canJog:!probeLocked&&!alarm&&workflow==='idle',
      canLoad:!probeLocked&&!alarm&&workflow==='idle',canStart:!probeLocked&&!alarm&&!!file&&!started,canResume:!probeLocked&&!alarm&&workflow==='paused',
      canPause:workflow==='running',canStop:workflow!=='idle',
      loadReason:probeLocked?'Palpage simulé en cours : autres commandes bloquées.':alarm?'Alarme simulée : voir l’onglet Machine.':workflow!=='idle'?'Arrêtez la simulation avant de charger un autre fichier.':'',
      startReason:alarm?'Alarme simulée : voir l’onglet Machine.':progress>=100?'Simulation terminée. Rechargez le fichier pour recommencer.':'Rechargez le fichier pour recommencer.',resumeReason:alarm?'Alarme simulée : voir l’onglet Machine.':''};
  }
  window.cncJobSimulation={request:function(method,body) {
    return new Promise(function(resolve,reject) {
      try {
        update();
        if(method==='GET') {resolve({controllers:[snapshot()]});return;}
        var a=body.action, state=snapshot();
        if(body.port!=='SIMULATION') throw new Error('Contrôleur virtuel uniquement.');
        if(a==='simulate-alarm'||a==='clear-simulated-alarm') {
          alarm=a==='simulate-alarm';ticket=null;
          if(alarm&&workflow==='running')workflow='paused';
          var alarmMessage=alarm?'Alarme fictive déclenchée. '+(workflow==='paused'?'Travail suspendu. ':'')+'Commandes bloquées.':'Alarme fictive effacée. Aucun démarrage automatique ; confirmez la reprise si le travail est en pause.';
          if(alarm&&probeLocked)window.dispatchEvent(new CustomEvent('cnc-probe-interrupt'));
          log(a,alarmMessage);resolve({message:alarmMessage});return;
        } else if(a==='jog'||a==='zero'||a==='reset-position') {
          if(!state.canJog)throw new Error('Arrêtez le travail simulé avant de déplacer les axes ou modifier l’origine.');
          if(a==='jog') {
            if(['x','y','z'].indexOf(body.axis)<0||[0.1,1,10].indexOf(body.step)<0||[1,-1].indexOf(body.direction)<0)throw new Error('Déplacement simulé invalide.');
            position[body.axis]=Math.round((position[body.axis]+body.step*body.direction)*1000)/1000;
          } else if(a==='zero') {
            if(['x','y','z','xyz'].indexOf(body.axis)<0)throw new Error('Axe invalide.');
            ['x','y','z'].forEach(function(axis){if(body.axis==='xyz'||body.axis===axis)offset[axis]=position[axis];});
          } else {position={x:0,y:0,z:0};offset={x:0,y:0,z:0};}
          ticket=null;
          log(a,a==='jog'?'Déplacement '+body.axis.toUpperCase()+' : '+(body.step*body.direction)+' mm.':a==='zero'?'Origine '+body.axis.toUpperCase()+' mise à zéro.':'Coordonnées fictives réinitialisées.');
          resolve({message:'SIMULATION — '+(a==='jog'?'Déplacement fictif effectué.':a==='zero'?'Origine de travail fictive mise à zéro, sans déplacement.':'Coordonnées fictives réinitialisées.')});return;
        } else if(a==='load') {
          if(!state.canLoad||!body.file) throw new Error('Chargement simulé indisponible.');
          file=body.file;name=file.replace(/--touch-\d{14}-[a-f0-9]{16}(?=\.[^.]+$)/,'');
          revision++;progress=0;started=false;ticket=null;
        } else if(a==='prepare') {
          if(body.revision!==revision || !(body.operation==='start'?state.canStart:body.operation==='resume'&&state.canResume)) throw new Error('Action simulée indisponible.');
          ticket={nonce:String(Date.now())+'-'+revision,operation:body.operation,expires:Date.now()+15000};
          resolve({nonce:ticket.nonce,name:name,expiresIn:15});return;
        } else if(a==='start'||a==='resume') {
          var t=ticket;ticket=null;
          if(!t||t.nonce!==body.nonce||t.operation!==a||Date.now()>=t.expires||!(a==='start'?state.canStart:state.canResume)) throw new Error('Confirmation simulée expirée ou invalide.');
          workflow='running';started=true;
        } else if(a==='pause') {
          if(!state.canPause) throw new Error('Aucune simulation en cours.');
          workflow='paused';ticket=null;
        } else if(a==='stop') {
          workflow='idle';ticket=null;started=true;
        } else throw new Error('Action simulée inconnue.');
        var message=({load:'Fichier sélectionné pour le test ; aucun G-code exécuté.',start:'Démarrage fictif.',resume:'Reprise fictive.',pause:'Pause fictive.',stop:'Travail fictif arrêté.'}[a]);
        log(a,message);resolve({message:'SIMULATION — '+message});
      } catch(e) {if(method!=='GET')log('rejected','Action refusée : '+e.message);reject(e);}
    });
  }};
  window.cncJobSimulation.acquireProbe=function(){
    update();
    if(probeLocked||alarm||workflow!=='idle'||(ticket&&Date.now()<ticket.expires))throw new Error('Un travail, une confirmation ou une alarme bloque le palpage fictif.');
    probeLocked=true;ticket=null;log('probe-lock','Banc de palpage fictif ouvert ; autres commandes bloquées.');
  };
  window.cncJobSimulation.releaseProbe=function(){if(probeLocked){probeLocked=false;log('probe-unlock','Banc de palpage fictif terminé.');}};
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click',function(){
      var target=tab.getAttribute('data-screen');
      document.querySelectorAll('.screen').forEach(function(s){s.classList.toggle('active',s.id==='screen-'+target);});
      document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t===tab);});
    });
  });
})();
