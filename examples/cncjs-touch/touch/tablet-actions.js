/* Réglages → Système → Tablette: installed interface version, update check, and
 * the host commands configured in CNCjs (Settings → Commands, `commands` in
 * .cncrc), e.g. update the interface, restart CNCjs, reboot or shut down.
 * This page only lists their titles and runs one after a second confirming tap;
 * what each command does is decided by whoever configured CNCjs. Refused while
 * a job is running or paused. Nothing here is sent to the controller. */
(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},locale:'fr-FR'};
  var t=uiLocale.t;
  var section=document.getElementById('ks-system'),panel=document.getElementById('screen-settings');
  if(!section||!panel)return;
  var CONFIRM_MS=8000,CHECK_MS=600000;

  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function set(n,value){if(n.textContent!==value)n.textContent=value;}

  var box=el('div','ks-system-block ks-tablet');
  var head=el('div','ks-system-row');head.appendChild(el('h3','',t('Tablette')));box.appendChild(head);
  var version=el('p','ks-tablet-version','');var update=el('p','ks-tablet-update','');
  box.appendChild(version);box.appendChild(update);
  var list=el('div','ks-tablet-actions');box.appendChild(list);
  var status=el('p','ks-system-note','');status.setAttribute('role','status');box.appendChild(status);
  var help=el('p','ks-system-note',t('Actions définies dans CNCjs (Réglages → Commandes). Chacune demande un second appui pour confirmer, et aucune n’est disponible pendant un travail.'));
  box.appendChild(help);
  var foot=section.lastChild;section.insertBefore(box,foot||null);

  var disposed=false,commands=[],buttons=[],armed=null,armTimer=null,busy=false,listXhr=null,info=null,checkedAt=-Infinity,remote=null;
  function token(){try{return JSON.parse(localStorage.getItem('cnc')).state.session.token||'';}catch(_){return '';}}
  function apiBase(){try{return window.cncState.get().apiBase;}catch(_){return '/api';}}
  function machine(){try{return window.cncState.get().machine;}catch(_){return null;}}
  function jobActive(){var m=machine();return !!(m&&(m.workflow==='running'||m.workflow==='paused'));}
  function shown(){return !disposed&&!document.hidden&&panel.classList.contains('active')&&panel.getAttribute('data-settings-tab')==='system';}
  function request(method,url,body,auth,done){
    var x=new XMLHttpRequest();x.open(method,url,true);x.timeout=8000;
    if(auth){var c=token();if(!c){done(401,null);return null;}x.setRequestHeader('Authorization','Bearer '+c);}
    if(body!==undefined)x.setRequestHeader('Content-Type','application/json');
    x.onload=function(){var data=null;try{data=JSON.parse(x.responseText);}catch(_){}done(x.status,data);};
    x.onerror=x.ontimeout=function(){done(0,null);};
    x.send(body===undefined?null:JSON.stringify(body));return x;
  }

  function disarm(){clearTimeout(armTimer);armTimer=null;armed=null;paint();}
  function paint(){
    var blocked=jobActive();
    buttons.forEach(function(b){
      var label=armed===b.id?t('Confirmer : ')+b.title:b.title;
      set(b.node,label);
      var disabled=busy||blocked;if(b.node.disabled!==disabled)b.node.disabled=disabled;
      var state=armed===b.id?'armed':'idle';if(b.node.getAttribute('data-state')!==state)b.node.setAttribute('data-state',state);
    });
    if(blocked&&buttons.length)set(status,t('Indisponible pendant un travail en cours ou en pause.'));
    else if(armed)set(status,t('Touchez à nouveau pour confirmer (8 s).'));
  }
  function run(command){
    if(busy||jobActive())return;
    if(armed!==command.id){armed=command.id;clearTimeout(armTimer);armTimer=setTimeout(disarm,CONFIRM_MS);paint();return;}
    clearTimeout(armTimer);armTimer=null;armed=null;busy=true;set(status,t('Envoi de « ')+command.title+t(' »…'));paint();
    request('POST',apiBase()+'/commands/run/'+encodeURIComponent(command.id),{},true,function(code,data){
      busy=false;
      if(code===200&&data&&data.taskId)set(status,t('« ')+command.title+t(' » lancée sur l’ordinateur du serveur.'));
      else if(code===401||code===403)set(status,t('Session CNCjs requise : ouvrez CNCjs et connectez-vous.'));
      else if(code===404)set(status,t('Commande introuvable. Actualisez la liste.'));
      else set(status,t('Commande non lancée : serveur injoignable ou refus.'));
      paint();
    });
  }
  function renderList(records){
    commands=records;armed=null;clearTimeout(armTimer);
    while(list.lastChild)list.removeChild(list.lastChild);
    buttons=records.map(function(r){
      var b=el('button','ks-secondary ks-tablet-action',r.title);b.type='button';
      b.addEventListener('click',function(){run(r);});list.appendChild(b);return {id:r.id,title:r.title,node:b};
    });
    set(status,records.length?'':t('Aucune commande activée dans CNCjs.'));
    paint();
  }
  function loadList(){
    if(listXhr)return;
    listXhr=request('GET',apiBase()+'/commands',undefined,true,function(code,data){
      listXhr=null;if(disposed)return;
      if(code===200&&data&&Array.isArray(data.records)){
        renderList(data.records.filter(function(r){return r&&r.enabled!==false&&typeof r.id==='string'&&typeof r.title==='string'&&r.title.trim();}).map(function(r){return {id:r.id,title:r.title.trim()};}));
      }else if(code===401||code===403){renderList([]);set(status,t('Session CNCjs requise : ouvrez CNCjs et connectez-vous.'));}
      else{renderList([]);set(status,t('Liste des commandes indisponible.'));}
    });
  }

  // Version: VERSION.json is written next to the pages by the deployment script.
  function date(iso){var d=new Date(iso);if(isNaN(d.getTime()))return '';try{return d.toLocaleString(uiLocale.locale,{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(_){return d.toISOString().slice(0,16).replace('T',' ');}}
  function short(sha){return typeof sha==='string'?sha.slice(0,7):'';}
  function renderVersion(){
    if(!info){set(version,t('Version de l’interface inconnue (déploiement manuel).'));set(update,'');return;}
    set(version,t('Interface ')+short(info.commit)+(info.branch?' · '+info.branch:'')+(info.deployedAt?' · '+t('installée le ')+date(info.deployedAt):''));
    if(!remote)set(update,info.repo?t('Recherche de mise à jour…'):'');
    else if(remote.error)set(update,t('Vérification de mise à jour impossible (pas d’accès à GitHub).'));
    else if(remote.sha===info.commit)set(update,t('À jour.'));
    else set(update,t('Mise à jour disponible : ')+short(remote.sha)+(remote.message?' — '+remote.message:''));
    var state=!remote||remote.error?'unknown':remote.sha===info.commit?'current':'available';
    if(update.getAttribute('data-state')!==state)update.setAttribute('data-state',state);
  }
  function checkRemote(){
    if(!info||!info.repo||!info.branch||Date.now()-checkedAt<CHECK_MS)return;
    checkedAt=Date.now();remote=null;renderVersion();
    request('GET','https://api.github.com/repos/'+info.repo+'/commits/'+encodeURIComponent(info.branch),undefined,false,function(code,data){
      remote=code===200&&data&&typeof data.sha==='string'?{sha:data.sha,message:data.commit&&typeof data.commit.message==='string'?data.commit.message.split('\n')[0].slice(0,80):''}:{error:true};
      renderVersion();
    });
  }
  function loadVersion(){
    request('GET','VERSION.json?'+Date.now(),undefined,false,function(code,data){
      info=code===200&&data&&typeof data.commit==='string'&&/^[0-9a-f]{7,40}$/.test(data.commit)?{commit:data.commit,branch:typeof data.branch==='string'?data.branch:'',repo:typeof data.repo==='string'&&/^[\w.-]+\/[\w.-]+$/.test(data.repo)?data.repo:'',deployedAt:data.deployedAt}:null;
      renderVersion();checkRemote();
    });
  }

  function refresh(){if(!shown()){if(armed)disarm();return;}loadList();if(info)checkRemote();else loadVersion();paint();}
  window.addEventListener('cnc-settings-tab',refresh);
  window.addEventListener('cnc-screen-change',refresh);
  window.addEventListener('cnc-job-status',function(){if(shown()&&buttons.length)paint();});
  window.addEventListener('pagehide',function(e){if(e&&e.persisted)return;disposed=true;clearTimeout(armTimer);});
  renderVersion();
  window.cncTabletActions={state:function(){return {commands:commands.length,armed:armed,busy:busy};}};
})();
