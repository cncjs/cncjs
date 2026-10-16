(function(){
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var paths={menu:'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',
    home:'M3 4h18v13H3z M8 21h8 M12 17v4 M6 12l4-4 4 5 4-6',
    files:'M3 7V4h7l3 3h8v13H3z M3 10h18',
    jog:'M12 2v20 M2 12h20 M8 6l4-4 4 4 M8 18l4 4 4-4 M6 8l-4 4 4 4 M18 8l4 4-4 4',
    origin:'M12 2v5 M12 17v5 M2 12h5 M17 12h5 M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M12 10v4 M10 12h4',
    machine:'M4 3h16v18H4z M7 7h10v5H7z M8 17h1 M15 17h1',
    history:'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
    back:'M10 5l-7 7 7 7 M3 12h18',
    alarm:'M12 3L2 21h20z M12 9v5 M12 17v1',
    check:'M4 12l5 5L20 6',settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'};
  function icon(name){return uiLocale.html('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="')+paths[name]+uiLocale.html('"/></svg>');}
  var simulation=document.body.getAttribute('data-simulation')==='true';
  var names={menu:uiLocale.t('Menu'),home:uiLocale.t('Suivi du travail'),files:uiLocale.t('Fichiers'),jog:uiLocale.t('Déplacer / Origine'),machine:uiLocale.t('Machine'),history:uiLocale.t('Journal'),settings:uiLocale.t('Réglages'),limits:uiLocale.t('Limites')};
  names.probe=uiLocale.t('Palpage');names['probe-profile']=uiLocale.t('Profils de sonde');names['probe-contact']=uiLocale.t('Test du contact');names['probe-report']=uiLocale.t('Résultats du palpage');
  names['probe-transfer']=uiLocale.t('Sauvegarde des profils');
  names['probe-preparation']=uiLocale.t('Préparation du palpage');
  names['guide']=uiLocale.t('Guide d’utilisation');
  var main=document.querySelector('main'),nav=document.getElementById('tabbar'),banner=document.getElementById(simulation?'simulation-banner':'real-banner');
  document.body.classList.add('ks-ui');
  document.body.classList.toggle('ks-real',!simulation);
  banner.innerHTML=uiLocale.html('<div class="ks-brand">CNCjs <strong>TOUCH</strong></div><h1 id="ks-title">Menu</h1><span class="ks-simulation">')+(simulation?uiLocale.t('SIMULATION'):uiLocale.t('MACHINE RÉELLE'))+uiLocale.html('</span><a href="')+(simulation?'index.html':'simulation.html')+'" class="ks-exit">'+(simulation?uiLocale.t('Interface réelle ↗'):uiLocale.t('Simulation ↗'))+uiLocale.html('</a>');
  var menu=document.createElement('section');menu.id='screen-menu';menu.className='screen';
  menu.innerHTML=uiLocale.html('<aside class="ks-overview"><div class="ks-state-label">CONTRÔLEUR VIRTUEL</div><h2 id="ks-state">Prêt</h2><p id="ks-current-file">Aucun fichier chargé</p><div class="ks-axis"><span>X</span><b id="ks-x">0.000</b><small>mm</small></div><div class="ks-axis"><span>Y</span><b id="ks-y">0.000</b><small>mm</small></div><div class="ks-axis"><span>Z</span><b id="ks-z">0.000</b><small>mm</small></div><p class="ks-help">Coordonnées de travail fictives.<br>Aucune commande au laser.</p></aside><div class="ks-tiles"></div>');
  main.insertBefore(menu,main.firstChild);
  if(!simulation){
    menu.querySelector('.ks-state-label').textContent=uiLocale.t('CONTRÔLEUR CNCjs');
    menu.querySelector('.ks-help').textContent=uiLocale.t('Coordonnées de travail du contrôleur. Déplacements à blanc ; origines désactivées.');
    document.getElementById('ks-state').textContent=uiLocale.t('Connexion…');
    ['x','y','z'].forEach(function(a){document.getElementById('ks-'+a).textContent='—';});
  }
  var menuLabels={jog:uiLocale.t('Préparer'),home:uiLocale.t('Suivi')},menuHints={jog:uiLocale.t('Déplacer · Origine · Palpage'),files:uiLocale.t('Choisir et charger un parcours'),home:uiLocale.t('Avancement et commandes'),machine:uiLocale.t('État et limites'),history:uiLocale.t('Événements et exports'),settings:uiLocale.t('Affichage et veille')};
  ['jog','files','home','machine','history','settings'].forEach(function(name){
    var i={files:0,jog:1,home:3,machine:4,history:2,settings:5}[name];
    var b=document.createElement('button');b.type='button';b.className='ks-tile ks-accent-'+i;b.innerHTML=icon(name)+uiLocale.html('<span>')+(menuLabels[name]||names[name])+uiLocale.html('</span><small>')+menuHints[name]+uiLocale.html('</small>');b.addEventListener('click',function(){go(name);});menu.querySelector('.ks-tiles').appendChild(b);
  });
  nav.innerHTML='';
  ['back','menu','jog','files','home'].forEach(function(name){
    var label=name==='back'?uiLocale.t('Retour'):menuLabels[name]||names[name];
    var b=document.createElement('button');b.className='ks-nav';b.setAttribute('aria-label',label);b.innerHTML=icon(name)+uiLocale.html('<span>')+label+uiLocale.html('</span>');b.setAttribute('data-ks-screen',name);b.addEventListener('click',function(){go(name==='back'?trail.pop()||'menu':name,name==='back');});nav.appendChild(b);
  });
  var active='menu',trail=[];
  function fitLibrary(){window.dispatchEvent(new CustomEvent('cnc-library-page-size',{detail:window.innerHeight<650?2:4}));window.dispatchEvent(new CustomEvent('cnc-history-page-size',{detail:window.innerHeight<650?3:5}));}
  window.addEventListener('resize',fitLibrary);fitLibrary();
  var openedSheet=null,sheetReturn=null;
  function closeSheet(){
    if(!openedSheet)return;
    openedSheet.hidden=true;openedSheet=null;
    main.inert=false;nav.inert=false;banner.inert=false;
    if(sheetReturn)sheetReturn.focus({preventScroll:true});
  }
  function sheet(id,title){
    var overlay=document.createElement('div');overlay.id=id;overlay.className='ks-sheet';overlay.hidden=true;
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby',id+'-title');
    overlay.innerHTML=uiLocale.html('<div class="ks-sheet-card"><header><h2 id="')+id+uiLocale.html('-title"></h2><button type="button" aria-label="Fermer">Fermer ×</button></header><div class="ks-sheet-content"></div></div>');
    overlay.querySelector('h2').textContent=title;overlay.querySelector('button').addEventListener('click',closeSheet);document.body.appendChild(overlay);
    return {content:overlay.querySelector('.ks-sheet-content'),open:function(){sheetReturn=document.activeElement;openedSheet=overlay;overlay.hidden=false;main.inert=true;nav.inert=true;banner.inert=true;overlay.querySelector('button').focus();}};
  }
  document.addEventListener('keydown',function(e){
    if(!openedSheet)return;
    if(e.key==='Escape'){e.preventDefault();closeSheet();}
    if(e.key==='Tab'){
      var focusable=Array.prototype.filter.call(openedSheet.querySelectorAll('button,input,select,a[href]'),function(el){return !el.disabled&&!el.hidden&&el.getClientRects().length;});
      var first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  var info=sheet('ks-file-info',uiLocale.t('Détails du fichier et de l’aperçu'));
  ['library-preview-note','library-regenerate','library-regenerate-status','job-state','job-selected'].forEach(function(id){info.content.appendChild(document.getElementById(id));});
  var portLabel=document.querySelector('label[for="job-port"]');info.content.appendChild(portLabel);info.content.appendChild(document.getElementById('job-port'));
  if(!simulation){var simulationLink=document.querySelector('.library-execution>a');if(simulationLink)info.content.appendChild(simulationLink);}
  var tools=document.createElement('div');tools.className='ks-file-tools';
  var dimensionsPanel=sheet('ks-dimensions',uiLocale.t('Dimensions du parcours XY')),dimensionsContent=document.getElementById('library-dimensions-content');
  dimensionsContent.hidden=false;dimensionsPanel.content.appendChild(dimensionsContent);
  var dimensionsButton=document.createElement('button');dimensionsButton.type='button';dimensionsButton.textContent=uiLocale.t('Dimensions XY');dimensionsButton.addEventListener('click',dimensionsPanel.open);tools.appendChild(dimensionsButton);
  var detailsButton=document.createElement('button');detailsButton.type='button';detailsButton.textContent=uiLocale.t('Détails de l’aperçu');detailsButton.addEventListener('click',info.open);tools.appendChild(detailsButton);
  var followButton=document.createElement('button');followButton.type='button';followButton.textContent=uiLocale.t('Ouvrir le suivi →');followButton.addEventListener('click',function(){go('home');});tools.appendChild(followButton);
  document.querySelector('.library-detail').appendChild(tools);
  var upload=sheet('ks-upload',uiLocale.t('Ajouter un fichier à la bibliothèque'));
  var uploadBlock=document.getElementById('library-upload');uploadBlock.open=true;uploadBlock.querySelector('summary').hidden=true;upload.content.appendChild(uploadBlock);
  var uploadButton=document.createElement('button');uploadButton.type='button';uploadButton.className='ks-upload-button';uploadButton.textContent=uiLocale.t('＋ Ajouter un fichier');uploadButton.addEventListener('click',upload.open);document.querySelector('.library-list-panel').appendChild(uploadButton);
  var refresh=document.getElementById('library-refresh');document.querySelector('.library-list-title').appendChild(refresh);document.querySelector('.library-header').hidden=true;
  document.getElementById('job-load').textContent=uiLocale.t('Charger la sélection');
  document.querySelector('.library-execution h2').textContent=simulation?uiLocale.t('Travail simulé'):uiLocale.t('Exécution sur la machine');
  function bindSheet(id,title,contentId,buttonId){
    var panel=sheet(id,title),content=document.getElementById(contentId);
    content.hidden=false;panel.content.appendChild(content);
    document.getElementById(buttonId).addEventListener('click',panel.open);
  }
  bindSheet('ks-origin-help-sheet',uiLocale.t('Comprendre l’origine'),'ks-origin-explanation','ks-origin-info');
  var preparationActions=document.createElement('div');preparationActions.className='ks-preparation-actions';
  var probeEntry=document.querySelector('#screen-jog .probe-entry');if(probeEntry){probeEntry.textContent=uiLocale.t('Palpage X / Y / Z');preparationActions.appendChild(probeEntry);}
  var originInfo=document.getElementById('ks-origin-info');originInfo.textContent=uiLocale.t('Aide aux repères');preparationActions.appendChild(originInfo);
  document.querySelector('#screen-jog .ks-panel-intro').appendChild(preparationActions);
  var originProbe=document.createElement('button');originProbe.type='button';originProbe.className='ks-secondary';originProbe.textContent=uiLocale.t('Ouvrir le palpage X / Y / Z');originProbe.addEventListener('click',function(){go('probe');});document.getElementById('ks-origin-explanation').appendChild(originProbe);
  if(simulation){
    bindSheet('ks-origin-reset-sheet',uiLocale.t('Réinitialiser la simulation'),'ks-origin-reset-content','ks-origin-reset');
    bindSheet('ks-machine-help-sheet',uiLocale.t('Test d’alarme fictive'),'ks-machine-explanation','ks-machine-info');
  }else{
    bindSheet('ks-machine-help-sheet',uiLocale.t('Fonctions de la machine'),'ks-machine-explanation','ks-machine-info');
    bindSheet('ks-jog-settings-sheet',uiLocale.t('Vitesse du test à blanc'),'ks-jog-settings-content','ks-jog-settings');
  }
  bindSheet('ks-history-export-sheet',uiLocale.t('Exporter le journal'),'ks-history-export-content','ks-history-export');
  if(!simulation){
    var historyButton=document.createElement('button');historyButton.type='button';historyButton.className='ks-secondary';
    historyButton.textContent=uiLocale.t('Journal des événements →');historyButton.addEventListener('click',function(){go('history');});
    document.querySelector('.ks-machine-overview').appendChild(historyButton);
  }
  document.getElementById('ks-machine-follow').addEventListener('click',function(){go('home');});
  document.getElementById('ks-machine-limits').addEventListener('click',function(){go('limits');});
  document.getElementById('ks-machine-display').addEventListener('click',function(){go('settings');});
  [['.ks-origin-zero','origin'],['#sim-trigger-alarm','alarm'],['#sim-clear-alarm','check']].forEach(function(pair){
    var button=document.querySelector(pair[0]);if(!button)return;
    var label=button.textContent;button.innerHTML=icon(pair[1])+uiLocale.html('<span>')+label+uiLocale.html('</span>');
  });
  function go(name,back){
    if(!document.getElementById('screen-'+name))return;
    closeSheet();
    if(name==='menu')trail=[];
    else if(name!==active&&!back){var earlier=trail.lastIndexOf(name);if(earlier>=0)trail=trail.slice(0,earlier);else{trail.push(active);if(trail.length>20)trail.shift();}}
    active=name;
    document.querySelectorAll('.screen').forEach(function(s){s.classList.toggle('active',s.id==='screen-'+name);});
    var navScreen=name==='probe'||name.indexOf('probe-')===0?'jog':name;
    document.querySelectorAll('.ks-nav').forEach(function(b){var target=b.getAttribute('data-ks-screen');b.classList.toggle('active',target===navScreen);if(target===navScreen)b.setAttribute('aria-current',target===name?'page':'location');else b.removeAttribute('aria-current');if(target==='back')b.disabled=name==='menu';});
    document.getElementById('ks-title').textContent=names[name];
    window.dispatchEvent(new CustomEvent('cnc-screen-change',{detail:name}));
  }
  window.addEventListener('cnc-job-status',function(e){
    var s=e.detail.machine;if(!!e.detail.simulation!==simulation)return;
    var el=document.getElementById('ks-state');setText(el,!s?uiLocale.t('Indisponible'):({Idle:uiLocale.t('Prêt'),Run:uiLocale.t('En cours'),Hold:uiLocale.t('En pause'),Alarm:uiLocale.t('Alarme')}[s.activeState]||s.activeState));el.classList.toggle('ks-alarm',!!s&&s.activeState==='Alarm');
    setText(document.getElementById('ks-current-file'),s&&s.name?(s.originalName||s.name):uiLocale.t('Aucun fichier chargé'));
    if(simulation)['x','y','z'].forEach(function(a){setText(document.getElementById('ks-'+a),s&&s.workPosition?s.workPosition[a].toFixed(3):'—');});
  });
  window.addEventListener('cnc-navigate',function(e){if(Object.prototype.hasOwnProperty.call(names,e.detail))go(e.detail);});
  function setText(el,value){if(el.textContent!==value)el.textContent=value;}
  if(!simulation){
    function copyCoordinates(){['x','y','z'].forEach(function(a){setText(document.getElementById('ks-'+a),document.getElementById('w'+a).textContent);});}
    var coordinateObserver=new MutationObserver(copyCoordinates);
    ['wx','wy','wz'].forEach(function(id){coordinateObserver.observe(document.getElementById(id),{childList:true,characterData:true,subtree:true});});copyCoordinates();
  }
  // Shared with later modules (macros): sheets with focus trapping and navigation.
  window.cncShell={sheet:sheet,closeSheet:closeSheet,go:go,preparationActions:preparationActions};
  go('menu',true);
})();
