(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var $=function(id){return document.getElementById(id);};
  var home=$('file');if(!home)return;
  home.parentNode.insertAdjacentHTML('beforeend',uiLocale.html('<div class="job-dashboard"><div class="job-art"><img id="home-job-image" alt="Aperçu du fichier" hidden><p id="home-image-status">Sélectionnez un fichier pour afficher son aperçu.</p></div><div class="job-metrics"><h2 id="home-job-title">Suivi du travail</h2><p id="home-job-name"></p><strong id="home-job-percent">—</strong><progress id="home-job-progress" max="100" value="0" aria-label="Avancement du travail"></progress><p id="home-job-eta">Temps restant : —</p><p id="home-job-note"></p></div></div>'));
  var execution=document.querySelector('.library-execution');
  $('home-job-note').insertAdjacentHTML('afterend',uiLocale.html('<div class="home-job-actions"><button id="home-job-pause" disabled>Pause</button><button id="home-job-resume" disabled>Reprendre…</button><button id="home-job-stop" disabled>Arrêter le travail</button></div><p id="home-job-feedback" role="status"></p>'));
  $('home-job-note').insertAdjacentHTML('afterend',uiLocale.html('<p id="home-job-ready" role="status"></p><p id="home-job-selection"></p><div class="home-job-actions home-job-primary"><button id="home-job-load" disabled>Charger la sélection</button><button id="home-job-start" disabled>Démarrer le fichier chargé…</button></div>'));
  ['load','start','pause','resume','stop'].forEach(function(action){
    $('home-job-'+action).addEventListener('click',function(){
      var source=$('job-'+action);
      if(!this.disabled&&source&&!source.disabled)source.click();
    });
  });
  // Realtime overrides (feed and spindle), active only while a program runs or is held.
  $('home-job-feedback').insertAdjacentHTML('afterend',uiLocale.html('<div id="home-overrides" class="home-overrides" hidden><p class="home-overrides-title">Corrections en cours de travail</p><p id="home-live" class="home-live"></p><p id="home-spindle-warning" class="home-spindle-warning" role="alert" hidden></p>')+
    ['feed','spindle'].map(function(kind){
      var label=kind==='feed'?uiLocale.t('Avance'):uiLocale.t('Broche');
      return '<div class="home-override" data-kind="'+kind+'"><span>'+label+'</span><b id="home-override-'+kind+'">—</b><div class="home-override-buttons">'+
        [[-10,'−10'],[-1,'−1'],[0,'100 %'],[1,'+1'],[10,'+10']].map(function(step){return '<button type="button" data-kind="'+kind+'" data-value="'+step[0]+'" disabled>'+step[1]+'</button>';}).join('')+'</div></div>';
    }).join('')+uiLocale.html('<p id="home-override-note" class="home-overrides-note"></p></div>'));
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
  function set(id,key,value){var el=$(id);if(el[key]!==value)el[key]=value;}
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
    var spinning=!!(c&&c.workflow==='paused'&&rpm!==null&&rpm>0);
    set('home-spindle-warning','hidden',!spinning);
    set('home-spindle-warning','textContent',spinning?uiLocale.t('Pause : les axes sont arrêtés mais la broche tourne toujours (Grbl ne l’arrête pas en pause). Ne mettez pas les mains près de l’outil.'):'');
    set('home-override-note','textContent',overrideOn?uiLocale.t('Pas de ±1 % / ±10 % envoyés au contrôleur en temps réel ; 100 % rétablit la valeur programmée.'):(c&&c.overrideReason)||'');
    var valid=c&&c.fresh&&c.name&&finiteNumber(c.total)&&c.total>0&&finiteNumber(c.received)&&c.received>=0&&c.received<=c.total,p=valid?c.received/c.total*100:0;
    // CNCjs rewinds the line counters when a program ends: the server says whether it finished.
    if(valid&&c.finished===true&&c.workflow==='idle')p=100;
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
      if(p>=100&&(simulation||c.finished===true))eta=simulation?uiLocale.t('Terminé — 0 s restantes'):uiLocale.t('Terminé — programme exécuté jusqu’au bout');
      else if(p>=100)eta=uiLocale.t('Toutes les lignes acquittées — attendre la fin des mouvements');
      else if(c.workflow==='idle'&&!c.canStart)eta=uiLocale.t('Travail arrêté — temps restant indisponible');
      else if(c.canStart)eta=simulation?(remaining!==null?uiLocale.t('Durée simulée : ')+duration(remaining):uiLocale.t('Temps restant : état indisponible')):uiLocale.t('Temps restant : estimation après démarrage');
      else if(c.workflow==='paused')eta=uiLocale.t('En pause — ')+(remaining!==null?duration(remaining)+uiLocale.t(' restantes'):uiLocale.t('estimation suspendue'));
      else eta=remaining!==null?uiLocale.t('Temps restant ')+(simulation?uiLocale.t('simulé'):uiLocale.t('estimé'))+' : '+duration(remaining):uiLocale.t('Temps restant : calcul en cours…');
    }
    if(visible('home')){
      var same=!!(c&&selection&&c.name===selection.file),different=!!(c&&c.name&&selection&&!same);
      var readiness=!c||!c.fresh?uiLocale.t('État indisponible : attendre la connexion.'):busy?uiLocale.t('Opération en cours…'):/^alarm/i.test(c.activeState||'')?(c.loadReason||uiLocale.t('Alarme active : commandes bloquées.')):c.workflow==='running'?uiLocale.t('Travail en cours.'):c.workflow==='paused'?uiLocale.t('Travail en pause.'):c.canStart?uiLocale.t('Fichier chargé, prêt à démarrer.'):!c.canLoad?(c.loadReason||c.startReason||uiLocale.t('Commande indisponible.')):
        c.name?(same?uiLocale.t('Rechargez le fichier pour un nouveau départ.'):uiLocale.t('Choisissez et chargez le fichier du prochain travail.')):
        selection?uiLocale.t('Chargez la sélection avant de démarrer.'):uiLocale.t('Choisissez un fichier dans Fichiers.');
      set('home-job-ready','textContent',readiness);
      set('home-job-selection','textContent',different?uiLocale.t('Sélection différente : ')+selection.name+uiLocale.t('. Charger la sélection remplacera le fichier chargé.'):'');
      set('home-job-load','textContent',same?uiLocale.t('Recharger le fichier'):uiLocale.t('Charger la sélection'));
      preview(file);
      set('home-job-title','textContent',simulation?uiLocale.t('Suivi — SIMULATION'):uiLocale.t('Suivi du travail'));
      set('home-job-name','textContent',c&&c.name?(c.originalName||c.name):selection?uiLocale.t('Sélectionné : ')+selection.name:uiLocale.t('Aucun fichier chargé'));
      set('home-job-percent','textContent',percent);set('home-job-progress','value',p);
      set('home-job-eta','textContent',eta);set('home-job-feedback','textContent',feedback);
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
