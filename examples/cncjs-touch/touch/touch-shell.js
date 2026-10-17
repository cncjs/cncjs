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
  names['commissioning']=uiLocale.t('Mise en service');
  var main=document.querySelector('main'),nav=document.getElementById('tabbar'),banner=document.getElementById(simulation?'simulation-banner':'real-banner');
  document.body.classList.add('ks-ui');
  document.body.classList.toggle('ks-real',!simulation);
  // The header is the status strip (status-strip.js fills its left part). The
  // screen title stays for assistive technology; the rail shows the place.
  banner.innerHTML=uiLocale.html('<h1 id="ks-title" class="ks-sr-only">Menu</h1><div class="t-strip-right"><span class="ks-simulation">')+(simulation?uiLocale.t('SIMULATION'):uiLocale.t('MACHINE RÉELLE'))+uiLocale.html('</span><a href="')+(simulation?'index.html':'simulation.html')+'" class="ks-exit">'+(simulation?uiLocale.t('Réel ↗'):uiLocale.t('Simulation ↗'))+uiLocale.html('</a></div>');
  var menu=document.createElement('section');menu.id='screen-menu';menu.className='screen';
  // Menu (UI 2027): the machine state lives in the strip; the menu is the
  // "resume where I was" shortcut plus six tiles, each with a live indicator.
  menu.innerHTML=uiLocale.html('<button type="button" id="ks-resume" class="ks-resume" hidden>')+icon('back')+uiLocale.html('<span class="ks-resume-text"><b id="ks-resume-title"></b><small id="ks-resume-hint"></small></span><span class="ks-resume-go">Ouvrir →</span></button><div class="ks-tiles"></div>');
  main.insertBefore(menu,main.firstChild);
  var menuLabels={jog:uiLocale.t('Préparer'),home:uiLocale.t('Suivi')},menuHints={jog:uiLocale.t('Déplacer · Origine · Palpage'),files:uiLocale.t('Choisir et charger un parcours'),home:uiLocale.t('Avancement et commandes'),machine:uiLocale.t('État et limites'),history:uiLocale.t('Événements et exports'),settings:uiLocale.t('Affichage · veille · système')};
  var tileOrder=['home','files','jog','machine','history','settings'],lives={};
  tileOrder.forEach(function(name){
    var b=document.createElement('button');b.type='button';b.className='ks-tile';b.setAttribute('data-ks-tile',name);
    b.innerHTML=icon(name)+uiLocale.html('<div class="ks-tile-text"><span>')+(menuLabels[name]||names[name])+uiLocale.html('</span><small>')+menuHints[name]+uiLocale.html('</small></div><span class="t-live"><i></i><span></span></span>');
    lives[name]=b.querySelector('.t-live');
    b.addEventListener('click',function(){go(name);});menu.querySelector('.ks-tiles').appendChild(b);
  });
  function live(name,tone,text){var el=lives[name];if(!el)return;if(el.getAttribute('data-tone')!==tone)el.setAttribute('data-tone',tone);setText(el.lastChild,text);}
  nav.innerHTML='';
  // Every screen on the rail; Retour appears only on a sub-screen (probe, limits…).
  var mainScreens=['menu','jog','files','home','machine','history','settings'];
  ['back'].concat(mainScreens).forEach(function(name){
    var label=name==='back'?uiLocale.t('Retour'):menuLabels[name]||names[name];
    var b=document.createElement('button');b.className='ks-nav';b.setAttribute('aria-label',label);b.innerHTML=icon(name)+uiLocale.html('<span>')+label+uiLocale.html('</span>');b.setAttribute('data-ks-screen',name);b.addEventListener('click',function(){go(name==='back'?trail.pop()||'menu':name,name==='back');});nav.appendChild(b);
  });
  var active='menu',trail=[];
  function fitLibrary(){window.dispatchEvent(new CustomEvent('cnc-library-page-size',{detail:window.innerHeight<650?2:5}));window.dispatchEvent(new CustomEvent('cnc-history-page-size',{detail:window.innerHeight<650?3:8}));}
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
  document.getElementById('job-load').textContent=uiLocale.t('Charger et ouvrir le Suivi');
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
    var historyButton=document.createElement('button');historyButton.type='button';historyButton.id='ks-machine-history';historyButton.className='ks-secondary';
    historyButton.textContent=uiLocale.t('Journal des événements →');historyButton.addEventListener('click',function(){go('history');});
    document.querySelector('.ks-machine-overview').appendChild(historyButton);
  }
  // Machine (UI 2027): the state as one large word, and an alarm explained in
  // plain words with what to do next, at the top of the overview card.
  var overview=document.querySelector('.ks-machine-overview');
  var machineWord=document.createElement('p');machineWord.id='ks-machine-word';machineWord.className='ks-machine-word';machineWord.setAttribute('data-tone','off');machineWord.textContent=uiLocale.t('Hors ligne');
  var machineAlarm=document.createElement('div');machineAlarm.id='ks-machine-alarm';machineAlarm.className='t-notice';machineAlarm.setAttribute('data-tone','danger');machineAlarm.hidden=true;
  machineAlarm.innerHTML=uiLocale.html('<div><b id="ks-machine-alarm-title"></b><span id="ks-machine-alarm-action"></span></div>');
  overview.insertBefore(machineAlarm,overview.firstChild);overview.insertBefore(machineWord,overview.firstChild);
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
    if(name==='menu')resumeBar();else remember(name);
    document.querySelectorAll('.screen').forEach(function(s){s.classList.toggle('active',s.id==='screen-'+name);});
    var navScreen=name==='probe'||name.indexOf('probe-')===0?'jog':name==='limits'||name==='commissioning'?'machine':name==='guide'?'settings':name;
    var sub=mainScreens.indexOf(name)<0;
    document.querySelectorAll('.ks-nav').forEach(function(b){var target=b.getAttribute('data-ks-screen');b.classList.toggle('active',target===navScreen);if(target===navScreen)b.setAttribute('aria-current',target===name?'page':'location');else b.removeAttribute('aria-current');if(target==='back'){b.disabled=name==='menu';if(b.hidden!==!sub)b.hidden=!sub;}});
    document.getElementById('ks-title').textContent=names[name];
    window.dispatchEvent(new CustomEvent('cnc-screen-change',{detail:name}));
  }
  // The last screen used survives a reload (the kiosk reloads after a deployment).
  var lastKey='cncjs-touch-last-screen',lastScreen='',lastMachine=null;
  try{var savedScreen=localStorage.getItem(lastKey);if(savedScreen&&mainScreens.indexOf(savedScreen)>0)lastScreen=savedScreen;}catch(_){}
  function remember(name){if(mainScreens.indexOf(name)<=0)return;lastScreen=name;try{localStorage.setItem(lastKey,name);}catch(_){}}
  function resumeBar(){
    var bar=document.getElementById('ks-resume');if(!bar)return;
    var show=!!lastScreen&&lastScreen!==active;
    if(bar.hidden!==!show)bar.hidden=!show;
    if(!show)return;
    var m=lastMachine;
    setText(document.getElementById('ks-resume-title'),uiLocale.t('Reprendre où j’en étais : ')+(menuLabels[lastScreen]||names[lastScreen]));
    setText(document.getElementById('ks-resume-hint'),m&&m.name?(m.originalName||m.name)+(m.workflow==='running'?uiLocale.t(' · en cours'):m.workflow==='paused'?uiLocale.t(' · en pause'):m.canStart?uiLocale.t(' · prêt à démarrer'):''):uiLocale.t('Aucun fichier chargé'));
  }
  document.getElementById('ks-resume').addEventListener('click',function(){if(lastScreen)go(lastScreen);});
  function updateTiles(m,connected){
    var alarm=!!(m&&/^alarm/i.test(m.activeState||'')),running=!!(m&&m.workflow==='running'),paused=!!(m&&m.workflow==='paused');
    var pct=m&&typeof m.total==='number'&&m.total>0&&typeof m.received==='number'?Math.min(100,Math.floor(m.received/m.total*100)):null;
    var file=m&&m.name?(m.originalName||m.name):'';
    var word=window.cncStatusStrip?window.cncStatusStrip.describe(m,connected):{word:connected&&m?m.activeState:uiLocale.t('Hors ligne'),tone:connected&&m?'info':'off'};
    live('home',!m||!connected?'off':alarm?'danger':running?'info':paused?'warn':m.canStart?'ok':'',
      !m||!connected?uiLocale.t('Hors ligne'):alarm?uiLocale.t('Alarme'):running?uiLocale.t('En cours')+(pct!==null?' · '+pct+' %':''):paused?uiLocale.t('En pause'):m.canStart?uiLocale.t('Prêt à démarrer'):file||uiLocale.t('Aucun fichier chargé'));
    live('files',file?'ok':'',file?uiLocale.t('Chargé : ')+file:uiLocale.t('Choisir un parcours'));
    live('jog',alarm?'danger':running||paused?'warn':simulation?'':'warn',alarm?uiLocale.t('Bloqué : alarme'):running||paused?uiLocale.t('Bloqué : travail en cours'):simulation?uiLocale.t('Simulateur'):uiLocale.t('Déplacements à blanc'));
    var commissioning=!simulation&&window.cncCommissioning&&typeof window.cncCommissioning.status==='function'?window.cncCommissioning.status():null;
    var toDo=commissioning&&(commissioning.state==='none'||commissioning.state==='progress');
    live('machine',alarm?'danger':toDo?'warn':word.tone,alarm?word.word:toDo?(commissioning.state==='progress'?uiLocale.t('Mise en service en cours'):uiLocale.t('Mise en service à faire')):word.word);
    live('history','',uiLocale.t('Chronologie et export'));
    live('settings','',uiLocale.t('Affichage · veille · système'));
    // Machine screen: the state word and the alarm explained.
    setText(machineWord,word.word);if(machineWord.getAttribute('data-tone')!==word.tone)machineWord.setAttribute('data-tone',word.tone);
    var help=alarm?(simulation?{title:uiLocale.t('Alarme fictive'),action:uiLocale.t('Effacez l’alarme ci-contre, puis confirmez la reprise dans Suivi.')}:window.CNCGrblHelp?window.CNCGrblHelp.alarm(m.alarmCode):{title:word.word,action:''}):null;
    if(machineAlarm.hidden!==!help)machineAlarm.hidden=!help;
    if(help){setText(document.getElementById('ks-machine-alarm-title'),help.title);setText(document.getElementById('ks-machine-alarm-action'),help.action);}
  }
  window.addEventListener('cnc-job-status',function(e){
    if(!!e.detail.simulation!==simulation)return;
    lastMachine=e.detail.machine;
    updateTiles(e.detail.machine,simulation?!!e.detail.machine:!!e.detail.transportConnected);
    if(active==='menu')resumeBar();
  });
  window.addEventListener('cnc-navigate',function(e){if(Object.prototype.hasOwnProperty.call(names,e.detail))go(e.detail);});
  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  updateTiles(null,false);
  // A disabled control answers a tap with its reason: disabled buttons let the
  // tap through (pointer-events: none in ui-2027.css), the document finds the
  // button under the finger and shows its title, its data-reason, or the
  // screen's own status line, in a short toast. No hover, no long press.
  var toast=document.createElement('div');toast.id='ks-why';toast.className='ks-why';toast.setAttribute('role','status');toast.hidden=true;document.body.appendChild(toast);
  var toastTimer=null;
  function whyFor(button){
    var reason=button.title||button.getAttribute('data-reason')||'';
    if(!reason){
      var status=document.querySelector('#screen-'+active+' [role="status"]'),text=status&&status.textContent.trim();
      if(button.id==='t-pause'||button.id==='t-stop')reason=uiLocale.t('Aucun travail en cours.');
      else if(text)reason=text;
      else reason=uiLocale.t('Indisponible dans l’état actuel de la machine.');
    }
    return reason;
  }
  document.addEventListener('click',function(e){
    if(!e.isTrusted||(e.target&&e.target.closest&&e.target.closest('button,a,input,select,label')))return;
    var x=e.clientX,y=e.clientY,hit=null;
    var candidates=document.querySelectorAll('.screen.active button:disabled, #real-banner button:disabled, #simulation-banner button:disabled, .job-dialog button:disabled, .ks-sheet button:disabled');
    for(var i=0;i<candidates.length&&!hit;i++){var r=candidates[i].getBoundingClientRect();if(r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)hit=candidates[i];}
    if(!hit)return;
    setText(toast,whyFor(hit));toast.hidden=false;
    if(toastTimer!==null)clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.hidden=true;toastTimer=null;},4000);
  });
  // Shared with later modules (macros): sheets with focus trapping and navigation.
  window.cncShell={sheet:sheet,closeSheet:closeSheet,go:go,preparationActions:preparationActions};
  go('menu',true);
})();
