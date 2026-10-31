(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var $=function(id){return document.getElementById(id);};
  var home=$('file');if(!home)return;
  // UI 2027: preview and overrides on the left; progress, coordinates, live
  // values and the actions on the right. Démarrer or Reprendre is the one
  // primary action; Arrêter stands alone at the bottom, never next to Pause.
  var simulationPage=document.body.getAttribute('data-simulation')==='true';
  home.parentNode.insertAdjacentHTML('beforeend',uiLocale.html('<div class="job-dashboard"><div id="home-left" class="home-left"><div class="job-art"><img id="home-job-image" alt="Aperçu du fichier" hidden><p id="home-image-status">Sélectionnez un fichier pour afficher son aperçu.</p></div></div><div class="job-metrics"><h2 id="home-job-title" class="ks-sr-only">Suivi du travail</h2><div class="t-card home-progress"><div class="home-progress-head"><strong id="home-job-percent">—</strong><div class="home-progress-text"><p id="home-job-eta">Temps restant : —</p><p id="home-job-name" class="ks-sr-only"></p></div></div><progress id="home-job-progress" max="100" value="0" aria-label="Avancement du travail"></progress></div><div id="home-coords" class="home-coords"></div><div class="home-live-tiles"><div class="t-card"><small>Avance réelle</small><b id="home-live-feed">—</b></div><div class="t-card"><small>Broche réelle</small><b id="home-live-spindle">—</b></div></div><p id="home-job-note" class="ks-sr-only"></p></div></div>'));
  var execution=document.querySelector('.library-execution');
  $('home-job-note').insertAdjacentHTML('afterend',uiLocale.html('<p id="home-job-ready" class="t-notice" role="status"></p><p id="home-job-selection" class="t-help"></p><button id="home-job-load" class="t-btn home-load" disabled>Charger la sélection</button><div id="home-job-primary-row" class="home-job-actions home-job-primary"><button id="home-job-start" class="t-btn t-btn--primary" disabled>Démarrer…</button><button id="home-job-pause" class="t-btn t-btn--warn t-btn--lg" disabled>Pause</button></div><div id="home-job-resume-row" class="home-job-actions home-job-resume" hidden><button id="home-job-resume" class="t-btn t-btn--primary" disabled>Reprendre…</button></div><p id="home-job-feedback" class="t-sent" role="status"></p><div class="home-stop"><button id="home-job-stop" class="t-btn t-btn--danger" disabled>Arrêter le travail</button><span class="t-help">Arrêt logiciel · pas un arrêt d’urgence</span></div>'));
  // The real page keeps its coordinate cards (#wx…, #mx…, written by app.js): they move under the progress.
  var coordsBox=$('home-coords');
  ['home-work-card','home-machine-card'].forEach(function(id){var card=$(id);if(card&&coordsBox&&typeof coordsBox.appendChild==='function')coordsBox.appendChild(card);});
  if(simulationPage&&coordsBox)coordsBox.insertAdjacentHTML('beforeend',uiLocale.html('<div class="card t-coords-card"><h2>Travail</h2><div class="t-coords"><span class="t-axis">X</span><b id="home-sim-x" class="t-val">—</b><span class="t-unit">mm</span><span class="t-axis">Y</span><b id="home-sim-y" class="t-val">—</b><span class="t-unit">mm</span><span class="t-axis">Z</span><b id="home-sim-z" class="t-val">—</b><span class="t-unit">mm</span></div></div>'));
  ['load','start','pause','resume','stop'].forEach(function(action){
    $('home-job-'+action).addEventListener('click',function(){
      var source=$('job-'+action);
      if(!this.disabled&&source&&!source.disabled)source.click();
    });
  });
  // Realtime overrides (feed and spindle), active only while a program runs or is held.
  // Overrides under the preview: ±10 % and 100 % as large steps, ±1 % as a second level.
  $('home-left').insertAdjacentHTML('beforeend',uiLocale.html('<div id="home-overrides" class="home-overrides t-card" hidden><div class="home-overrides-head"><p class="home-overrides-title">Corrections</p><p id="home-live" class="home-live ks-sr-only"></p></div><p id="home-spindle-warning" class="t-notice" data-tone="warn" role="alert" hidden></p>')+
    ['feed','spindle'].map(function(kind){
      var label=kind==='feed'?uiLocale.t('Avance'):uiLocale.t('Broche');
      return '<div class="t-override" data-kind="'+kind+'"><div class="t-ov-name">'+label+'<b id="home-override-'+kind+'">—</b></div><div class="t-ov-row">'+
        [[-10,'−10 %',''],[0,'100 %',' t-btn--ghost'],[10,'+10 %',''],[-1,'−1 %',' t-btn--ghost t-fine'],[1,'+1 %',' t-btn--ghost t-fine']].map(function(step){return '<button type="button" class="t-btn'+step[2]+'" data-kind="'+kind+'" data-value="'+step[0]+'" disabled>'+step[1]+'</button>';}).join('')+'</div></div>';
    }).join('')+uiLocale.html('<p id="home-override-note" class="t-help"></p></div>'));
  var overridesBox=$('home-overrides');
  overridesBox.addEventListener('click',function(e){
    var button=e.target&&e.target.closest?e.target.closest('button[data-kind]'):null;
    if(!button||button.disabled||!window.cncJobControls||typeof window.cncJobControls.override!=='function')return;
    window.cncJobControls.override(button.getAttribute('data-kind'),Number(button.getAttribute('data-value'))).catch(function(){});
  });
  function number(v){try{return Math.round(v).toLocaleString(uiLocale.locale||'fr-FR');}catch(_){return String(Math.round(v));}}
  function overrideButtons(){return overridesBox.querySelectorAll?overridesBox.querySelectorAll('button'):[];}
  execution.insertAdjacentHTML('beforeend',uiLocale.html('<p id="job-progress-summary" role="status"></p>'));
  var selection=window.cncLibrarySelection||null,machine=null,simulation=false,imageKey='',request=0,track=null,busy=false,feedback='';
  var previewRequest=null,imageLoading=false,previewFailed=false,mounted=false;
  function finiteNumber(value){return typeof value==='number'&&isFinite(value);}
  function elapsedClock(){return window.performance&&typeof window.performance.now==='function'?window.performance.now():Date.now();}
  function visible(name){var screen=$('screen-'+name);return !document.hidden&&!!screen&&screen.classList.contains('active');}
  // A text is written into its single text node: replacing the node (textContent) also
  // restyles it, at every report for the live values.
  function set(id,key,value){var el=$(id);if(el[key]===value)return;var n=key==='textContent'&&el.firstChild;if(n&&n.nodeType===3&&!n.nextSibling)n.data=value;else el[key]=value;}
  function cancelPreview(){
    request++;var xhr=previewRequest;previewRequest=null;
    if(xhr&&typeof xhr.abort==='function')xhr.abort();
    if(xhr||imageLoading)imageKey='';
    imageLoading=false;$('home-job-image').onload=null;$('home-job-image').onerror=null;
  }
  function duration(s) {
    s=Math.max(0,Math.ceil(s));var h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;
    return (h?h+' h ':'')+(m?m+' min ':'')+sec+' s';
  }
  // Remaining time: to the second under 2 minutes, then to the (next) minute. Shown at every
  // report, a seconds count rewrote the text 4 times a second, and each rewrite lays Suivi out.
  function remainingText(s) {
    if(!(s>=120))return duration(s);
    var m=Math.ceil(s/60),h=Math.floor(m/60);m%=60;
    return (h?h+' h ':'')+(h&&!m?'':m+' min');
  }
  function preview(file) {
    if(file===imageKey)return;
    cancelPreview();imageKey=file;previewFailed=false;var id=++request;
    var img=$('home-job-image');img.hidden=true;img.removeAttribute('src');
    img.cncPreview=null;
    $('home-image-status').hidden=false;
    $('home-image-status').textContent=file?uiLocale.t('Chargement de l’aperçu…'):uiLocale.t('Sélectionnez un fichier pour afficher son aperçu.');
    if(!file)return;
    var token='';try{token=JSON.parse(localStorage.getItem('cnc')).state.session.token;}catch(_){}
    if(!token){$('home-image-status').textContent=uiLocale.t('Session CNCjs requise pour lire l’aperçu.');return;}
    var xhr=new XMLHttpRequest();previewRequest=xhr;xhr.open('POST','/api/watch/file',true);xhr.timeout=20000;
    xhr.setRequestHeader('Authorization','Bearer '+token);xhr.setRequestHeader('Content-Type','application/json');
    function fail(){if(id===request){previewRequest=null;imageLoading=false;previewFailed=true;img.hidden=true;$('home-image-status').hidden=false;set('home-image-status','textContent',uiLocale.t('Aperçu indisponible. Régénérez-le dans Fichiers.'));}}
    xhr.onload=function(){
      if(id!==request)return;
      previewRequest=null;
      try{
        if(xhr.status!==200)throw new Error();
        var meta=JSON.parse(JSON.parse(xhr.responseText).data),src=meta.preview&&meta.preview.image;
        if(meta.file!==file||typeof src!=='string'||src.length>2500000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src))throw new Error();
        img.cncPreview={file:file,projection:meta.preview.projection,trail:Array.isArray(meta.preview.trail)?meta.preview.trail:null,lines:meta.preview.lines};
        imageLoading=true;
        img.onload=function(){if(id===request){imageLoading=false;img.hidden=false;$('home-image-status').hidden=true;}};
        img.onerror=fail;img.src=src;
      }catch(_){fail();}
    };xhr.onerror=xhr.ontimeout=fail;xhr.send(JSON.stringify({file:file+'.cnctouch.json'}));
  }
  function render() {
    var c=machine,now=elapsedClock(),file=c&&c.name?c.name:selection&&selection.file||'';
    set('home-job-load','disabled',busy||!c||!c.fresh||!selection||!c.canLoad);
    set('home-job-start','disabled',busy||!c||!c.fresh||!c.canStart);
    // These states also guard the enlarged preview's command relay while Home is hidden.
    set('home-job-pause','disabled',!c||!c.canPause);
    set('home-job-resume','disabled',busy||!c||!c.canResume);
    set('home-job-stop','disabled',!c||!c.canStop);
    var overrides=c&&c.overrides&&typeof c.overrides==='object'?c.overrides:null,overrideOn=!!(c&&c.fresh&&c.canOverride&&!busy);
    set('home-overrides','hidden',!c||!('canOverride' in c));
    set('home-override-feed','textContent',overrides&&finiteNumber(overrides.feed)?overrides.feed+' %':'—');
    set('home-override-spindle','textContent',overrides&&finiteNumber(overrides.spindle)?overrides.spindle+' %':'—');
    Array.prototype.forEach.call(overrideButtons(),function(button){if(button.disabled!==!overrideOn)button.disabled=!overrideOn;});
    // Real values from Grbl's FS: field. A feed hold stops the axes, not the spindle.
    var liveOk=!!(c&&c.fresh),feed=liveOk&&finiteNumber(c.feedrate)?c.feedrate:null,rpm=liveOk&&finiteNumber(c.spindleSpeed)?c.spindleSpeed:null;
    set('home-live','textContent',feed===null&&rpm===null?'':uiLocale.t('Avance réelle ')+(feed===null?'—':number(feed)+' mm/min')+uiLocale.t(' · Broche ')+(rpm===null?'—':number(rpm)+uiLocale.t(' tr/min')));
    set('home-live-feed','textContent',feed===null?'—':number(feed)+' mm/min');
    set('home-live-spindle','textContent',rpm===null?'—':number(rpm)+uiLocale.t(' tr/min'));
    // Reprendre takes the primary place while the job is held; Démarrer otherwise.
    var held=!!(c&&c.workflow==='paused');
    set('home-job-resume-row','hidden',!held);set('home-job-primary-row','hidden',held);
    // Charger only shows while the machine is idle and something is selected: one primary action per screen.
    var busyJob=!!(c&&c.workflow&&c.workflow!=='idle');
    set('home-job-load','hidden',!selection||busyJob);
    // During a job nothing else distracts: no selection notice, the override help only as a reason.
    set('home-job-selection','hidden',busyJob);
    var box=$('home-overrides');if(box&&typeof box.setAttribute==='function'&&(!box.getAttribute||box.getAttribute('data-on')!==String(overrideOn)))box.setAttribute('data-on',String(overrideOn));
    if(simulationPage&&c&&c.workPosition)['x','y','z'].forEach(function(a){set('home-sim-'+a,'textContent',finiteNumber(c.workPosition[a])?c.workPosition[a].toFixed(3):'—');});
    var spinning=!!(c&&c.workflow==='paused'&&rpm!==null&&rpm>0);
    set('home-spindle-warning','hidden',!spinning);
    set('home-spindle-warning','textContent',spinning?uiLocale.t('Pause : les axes sont arrêtés mais la broche tourne toujours (Grbl ne l’arrête pas en pause). Ne mettez pas les mains près de l’outil.'):'');
    set('home-override-note','textContent',overrideOn?uiLocale.t('Pas de ±1 % / ±10 % envoyés au contrôleur en temps réel ; 100 % rétablit la valeur programmée.'):(c&&c.overrideReason?uiLocale.message?uiLocale.message(c.overrideReason):uiLocale.t(c.overrideReason):''));
    var valid=c&&c.fresh&&c.name&&finiteNumber(c.total)&&c.total>0&&finiteNumber(c.received)&&c.received>=0&&c.received<=c.total,p=valid?c.received/c.total*100:0;
    // CNCjs rewinds the line counters when a program ends: the server says whether it finished.
    // A program that reached its end with lines refused by Grbl (error:N) is not "finished".
    var failed=!simulation&&c&&c.finishedWithErrors===true&&finiteNumber(c.jobErrors)&&c.jobErrors>0;
    if(valid&&(c.finished===true||failed)&&c.workflow==='idle')p=100;
    var percent=valid?Math.floor(p)+' %':'—',remaining=null,eta=uiLocale.t('Temps restant : —');
    var key=c?simulation+':'+c.port+':'+c.name+':'+c.revision+':'+c.total:'';
    if(!valid){track=null;eta=c&&c.fresh&&!c.name?uiLocale.t('Temps restant : chargez un fichier'):uiLocale.t('Temps restant : état indisponible');}
    else {
      if(!track||track.key!==key||p<track.p)track={key:key,p:p,last:now,active:0,advance:0,running:false};
      var dt=(now-track.last)/1000;
      // Discontinuous observations must not reuse an estimate learned before sleep or a clock jump.
      if(dt<0||dt>3){track.active=0;track.advance=0;}
      else if(track.running&&c.workflow==='running'&&dt>0){track.active+=dt;track.advance+=Math.max(0,p-track.p);}
      track.last=now;track.p=p;track.running=c.workflow==='running';
      if(simulation){if(finiteNumber(c.remainingSeconds)&&c.remainingSeconds>=0)remaining=c.remainingSeconds;}
      else if(track.active>=10&&track.advance>0)remaining=(100-p)*track.active/track.advance;
      if(!finiteNumber(remaining)||remaining<0)remaining=null;
      if(p>=100&&failed)eta=uiLocale.t('Fin du programme avec ')+c.jobErrors+uiLocale.t(' erreur(s) Grbl — vérifiez la pièce');
      else if(p>=100&&(simulation||c.finished===true))eta=simulation?uiLocale.t('Terminé — 0 s restantes'):uiLocale.t('Terminé — programme exécuté jusqu’au bout');
      else if(p>=100)eta=uiLocale.t('Toutes les lignes acquittées — attendre la fin des mouvements');
      else if(c.workflow==='idle'&&!c.canStart)eta=uiLocale.t('Travail arrêté — temps restant indisponible');
      else if(c.canStart)eta=simulation?(remaining!==null?uiLocale.t('Durée simulée : ')+duration(remaining):uiLocale.t('Temps restant : état indisponible')):uiLocale.t('Temps restant : estimation après démarrage');
      else if(c.workflow==='paused')eta=uiLocale.t('En pause — ')+(remaining!==null?remainingText(remaining)+uiLocale.t(' restantes'):uiLocale.t('estimation suspendue'));
      else eta=remaining!==null?uiLocale.t('Temps restant ')+(simulation?uiLocale.t('simulé'):uiLocale.t('estimé'))+' : '+remainingText(remaining):uiLocale.t('Temps restant : calcul en cours…');
    }
    if(visible('home')){
      var same=!!(c&&selection&&c.name===selection.file),different=!!(c&&c.name&&selection&&!same);
      var readiness=!c||!c.fresh?uiLocale.t('État indisponible : attendre la connexion.'):busy?uiLocale.t('Opération en cours…'):/^alarm/i.test(c.activeState||'')?(!simulation&&window.CNCGrblHelp?window.CNCGrblHelp.text(window.CNCGrblHelp.alarm(c.alarmCode)):(c.loadReason?(uiLocale.message||uiLocale.t)(c.loadReason):uiLocale.t('Alarme active : commandes bloquées.'))):
        // CNCjs still waits for Grbl's reply while Grbl stays idle: a lost line or acknowledgement.
        c.workflow==='running'&&finiteNumber(c.stalledMs)?uiLocale.t('Travail bloqué ? Grbl est au repos depuis ')+Math.round(c.stalledMs/1000)+uiLocale.t(' s alors que CNCjs attend encore sa réponse (ligne ou acquittement perdu). Si rien ne bouge, arrêtez le travail.'):
        c.workflow==='running'?uiLocale.t('Travail en cours.'):
        failed&&window.CNCGrblHelp&&finiteNumber(c.jobLastError)?uiLocale.t('Dernière erreur : ')+window.CNCGrblHelp.text(window.CNCGrblHelp.error(c.jobLastError)):c.workflow==='paused'?uiLocale.t('Travail en pause.'):c.canStart?uiLocale.t('Fichier chargé, prêt à démarrer.'):!c.canLoad?((c.loadReason||c.startReason)?(uiLocale.message||uiLocale.t)(c.loadReason||c.startReason):uiLocale.t('Commande indisponible.')):
        c.name?(same?uiLocale.t('Rechargez le fichier pour un nouveau départ.'):uiLocale.t('Choisissez et chargez le fichier du prochain travail.')):
        selection?uiLocale.t('Chargez la sélection avant de démarrer.'):uiLocale.t('Choisissez un fichier dans Fichiers.');
      set('home-job-ready','textContent',readiness);
      // The notice's tone follows the colour rules: red alarm, amber hold, blue running, green ready.
      var tone=!c||!c.fresh?'off':/^alarm/i.test(c.activeState||'')||failed?'danger':c.workflow==='paused'||finiteNumber(c.stalledMs)&&c.workflow==='running'?'warn':c.workflow==='running'?'info':c.canStart?'ok':'off';
      var ready=$('home-job-ready');if(ready&&typeof ready.setAttribute==='function'&&(!ready.getAttribute||ready.getAttribute('data-tone')!==tone))ready.setAttribute('data-tone',tone);
      set('home-job-selection','textContent',different?uiLocale.t('Sélection différente : ')+selection.name+uiLocale.t('. Charger la sélection remplacera le fichier chargé.'):'');
      set('home-job-load','textContent',same?uiLocale.t('Recharger le fichier'):uiLocale.t('Charger la sélection'));
      preview(file);
      set('home-job-title','textContent',simulation?uiLocale.t('Suivi — SIMULATION'):uiLocale.t('Suivi du travail'));
      set('home-job-name','textContent',c&&c.name?(c.originalName||c.name):selection?uiLocale.t('Sélectionné : ')+selection.name:uiLocale.t('Aucun fichier chargé'));
      set('home-job-percent','textContent',percent);set('home-job-progress','value',p);
      // The static help sentence of the job controls is not a command result: only results show here.
      set('home-job-eta','textContent',eta);set('home-job-feedback','textContent',feedback===uiLocale.t('Le chargement ne démarre pas le travail.')?'':feedback);
      set('home-job-note','textContent',simulation?uiLocale.t('Progression fictive sur 60 secondes, hors pauses. Aucun G-code exécuté.'):uiLocale.t('Progression des lignes acquittées. Estimation indicative selon le rythme observé, pas selon la durée des mouvements.'));
    }
    if(visible('files'))set('job-progress-summary','textContent',percent+' · '+eta);
  }
  window.addEventListener('cnc-library-select',function(e){selection=e.detail;render();});
  window.addEventListener('cnc-job-status',function(e){machine=e.detail.machine;simulation=e.detail.simulation;busy=!!e.detail.busy;feedback=e.detail.feedback||'';render();});
  window.addEventListener('cnc-library-preview-updated',function(e){
    var file=machine&&machine.name?machine.name:selection&&selection.file||'';
    if(e.detail&&e.detail.file&&e.detail.file!==file)return;
    cancelPreview();imageKey='';render();
  });
  function mount(){if(mounted||!visible('home'))return;mounted=true;if(previewFailed)imageKey='';render();}
  function unmount(){if(!mounted)return;mounted=false;cancelPreview();}
  window.addEventListener('cnc-screen-change',function(e){if(e.detail==='home')mount();else{unmount();if(e.detail==='files')render();}});
  document.addEventListener('visibilitychange',function(){if(visible('home'))mount();else unmount();});
  window.cncDashboardView={mount:mount,unmount:unmount};
  mount();
  render();
})();
