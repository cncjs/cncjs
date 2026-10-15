(function () {
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var home=$('file');if(!home)return;
  home.parentNode.insertAdjacentHTML('beforeend','<div class="job-dashboard"><div class="job-art"><img id="home-job-image" alt="Aperçu du fichier" hidden><p id="home-image-status">Sélectionnez un fichier pour afficher son aperçu.</p></div><div class="job-metrics"><h2 id="home-job-title">Suivi du travail</h2><p id="home-job-name"></p><strong id="home-job-percent">—</strong><progress id="home-job-progress" max="100" value="0" aria-label="Avancement du travail"></progress><p id="home-job-eta">Temps restant : —</p><p id="home-job-note"></p></div></div>');
  var execution=document.querySelector('.library-execution');
  $('home-job-note').insertAdjacentHTML('afterend','<div class="home-job-actions"><button id="home-job-pause" disabled>Pause</button><button id="home-job-resume" disabled>Reprendre…</button><button id="home-job-stop" disabled>Arrêter le travail</button></div><p id="home-job-feedback" role="status"></p>');
  ['pause','resume','stop'].forEach(function(action){
    $('home-job-'+action).addEventListener('click',function(){
      var source=$('job-'+action);
      if(source&&!source.disabled)source.click();
    });
  });
  execution.insertAdjacentHTML('beforeend','<p id="job-progress-summary" role="status"></p>');
  var selection=window.cncLibrarySelection||null,machine=null,simulation=false,imageKey='',request=0,track=null,busy=false,feedback='';
  var previewRequest=null,imageLoading=false,previewFailed=false,mounted=false;
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
    $('home-image-status').hidden=false;
    $('home-image-status').textContent=file?'Chargement de l’aperçu…':'Sélectionnez un fichier pour afficher son aperçu.';
    if(!file)return;
    var token='';try{token=JSON.parse(localStorage.getItem('cnc')).state.session.token;}catch(_){}
    if(!token){$('home-image-status').textContent='Session CNCjs requise pour lire l’aperçu.';return;}
    var xhr=new XMLHttpRequest();previewRequest=xhr;xhr.open('POST','/api/watch/file',true);xhr.timeout=20000;
    xhr.setRequestHeader('Authorization','Bearer '+token);xhr.setRequestHeader('Content-Type','application/json');
    function fail(){if(id===request){previewRequest=null;imageLoading=false;previewFailed=true;img.hidden=true;$('home-image-status').hidden=false;set('home-image-status','textContent','Aperçu indisponible. Régénérez-le dans Fichiers.');}}
    xhr.onload=function(){
      if(id!==request)return;
      previewRequest=null;
      try{
        if(xhr.status!==200)throw new Error();
        var meta=JSON.parse(JSON.parse(xhr.responseText).data),src=meta.preview&&meta.preview.image;
        if(meta.file!==file||typeof src!=='string'||src.length>2500000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src))throw new Error();
        imageLoading=true;
        img.onload=function(){if(id===request){imageLoading=false;img.hidden=false;$('home-image-status').hidden=true;}};
        img.onerror=fail;img.src=src;
      }catch(_){fail();}
    };xhr.onerror=xhr.ontimeout=fail;xhr.send(JSON.stringify({file:file+'.cnctouch.json'}));
  }
  function render() {
    var c=machine,now=Date.now(),file=c&&c.name?c.name:selection&&selection.file||'';
    // These states also guard the enlarged preview's command relay while Home is hidden.
    set('home-job-pause','disabled',!c||!c.canPause);
    set('home-job-resume','disabled',busy||!c||!c.canResume);
    set('home-job-stop','disabled',!c||!c.canStop);
    var valid=c&&c.fresh&&c.name&&c.total>0&&isFinite(c.received),p=valid?Math.max(0,Math.min(100,c.received/c.total*100)):0;
    var percent=valid?Math.floor(p)+' %':'—',remaining=null,eta='Temps restant : —';
    var key=c?c.port+':'+c.name+':'+c.revision:'';
    if(!valid){track=null;eta=c?'Temps restant : chargez un fichier':'Temps restant : état indisponible';}
    else {
      if(!track||track.key!==key||p<track.p)track={key:key,p:p,last:now,active:0,advance:0,running:false};
      var dt=(now-track.last)/1000;
      if(track.running&&c.workflow==='running'&&dt<=3){track.active+=dt;track.advance+=Math.max(0,p-track.p);}
      track.last=now;track.p=p;track.running=c.workflow==='running';
      if(simulation&&typeof c.remainingSeconds==='number')remaining=c.remainingSeconds;
      else if(track.active>=10&&track.advance>0)remaining=(100-p)*track.active/track.advance;
      if(p>=100)eta=simulation?'Terminé — 0 s restantes':'Toutes les lignes acquittées — attendre la fin des mouvements';
      else if(c.workflow==='idle'&&!c.canStart)eta='Travail arrêté — temps restant indisponible';
      else if(c.canStart)eta=simulation?'Durée simulée : '+duration(remaining):'Temps restant : estimation après démarrage';
      else if(c.workflow==='paused')eta='En pause — '+(remaining!==null?duration(remaining)+' restantes':'estimation suspendue');
      else eta=remaining!==null?'Temps restant '+(simulation?'simulé':'estimé')+' : '+duration(remaining):'Temps restant : calcul en cours…';
    }
    if(visible('home')){
      preview(file);
      set('home-job-title','textContent',simulation?'Suivi — SIMULATION':'Suivi du travail');
      set('home-job-name','textContent',c&&c.name?(c.originalName||c.name):selection?'Sélectionné : '+selection.name:'Aucun fichier chargé');
      set('home-job-percent','textContent',percent);set('home-job-progress','value',p);
      set('home-job-eta','textContent',eta);set('home-job-feedback','textContent',feedback);
      set('home-job-note','textContent',simulation?'Progression fictive sur 60 secondes, hors pauses. Aucun G-code exécuté.':'Progression des lignes acquittées. Estimation indicative selon le rythme observé, pas selon la durée des mouvements.');
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
