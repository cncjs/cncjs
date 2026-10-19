/* Mise en service: a step-by-step check of a newly connected machine before its
 * first job (E-stop, limit switches, probe, homing, spindle, air cut). It opens
 * by itself the first time a real controller is seen (simulator ports aside),
 * can be skipped under the operator's responsibility, resumes where it was left
 * and remembers the outcome per controller port. $X, $H and the spindle test go
 * through cncJobControls and its confirmation dialog, checked again by the
 * server; every other check only reads the controller's status reports. */
(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},locale:'fr-FR'};
  var t=uiLocale.t;
  var KEY='cncjs-touch-commissioning-v1',TEST_FILE='essai-en-l-air.nc';
  var STEPS=['prepare','backup','estop','limits','probe','homing','spindle','aircut','summary'];
  var TITLES={prepare:t('Avant de commencer'),backup:t('Sauvegarde des réglages'),estop:t('Arrêt d’urgence'),limits:t('Fins de course'),probe:t('Sonde'),
    homing:t('Prise d’origine'),spindle:t('Broche et variateur'),aircut:t('Fichier « en l’air »'),summary:t('Bilan')};

  // ---- Pure model (also used by the offline tests) ----
  function alarm(m){return !!m&&/^Alarm/.test(m.activeState||'');}
  // Triggered inputs from a fresh report ('' = none), or null when unknown.
  function pins(m){var p=m&&m.probeInput;return p&&p.fresh&&typeof p.pins==='string'?p.pins:null;}
  // Updates a step's observations from one machine snapshot (m may be null).
  function observe(id,st,m){
    if(id==='estop'){
      // Armed once the machine was seen out of alarm: an alarm already present
      // (homing required at power-on) is not taken for the E-stop.
      // A gap in the reports is not an E-stop (the event stream renews itself
      // every minute): only a fresh alarm, or a board restart counted by the
      // server (m.startups), proves that the E-stop acted.
      if(!m||!m.fresh)return st;
      var starts=typeof m.startups==='number'?m.startups:null;
      if(alarm(m)){if(st.armed)st.alarm=true;}
      else{
        if(st.armed&&starts!==null&&st.startups!==null&&starts>st.startups)st.lost=true;
        if(m.activeState==='Idle'&&(st.alarm||st.lost))st.back=true;
        if(!st.armed)st.startups=starts;
        st.armed=true;
      }
    }else if(id==='limits'||id==='probe'){
      var p=pins(m),letters=id==='limits'?['X','Y','Z']:['P'];
      st.free=st.free||{};st.seen=st.seen||{};st.active=st.active||{};
      letters.forEach(function(a){
        if(p===null){st.active[a]=null;return;}
        var on=p.indexOf(a)>=0;st.active[a]=on;
        if(on){if(st.free[a])st.seen[a]=true;return;}
        if(st.seen[a]){st.released=st.released||{};st.released[a]=true;}
        st.free[a]=true;
      });
    }else if(id==='homing'){
      // st.sent: $H accepted by the server, in state st.from. Some controllers stop
      // answering during the cycle, so leaving that state (Home, or no report)
      // counts as the cycle; an alarm afterwards is a failure.
      if(st.sent&&(!m||!m.fresh||m.activeState!==st.from))st.left=true;
      // The server knows the cycle from the $H it sent (Grbl may report nothing during it).
      if(m&&m.homing){st.homing=true;st.failed=false;}
      if(m&&m.fresh){
        if(m.activeState==='Home'){st.homing=true;st.failed=false;}
        else if(alarm(m)&&(st.homing||st.sent&&st.left)){st.failed=true;st.homing=false;st.sent=false;}
        else if(m.activeState==='Idle'&&(st.homing||st.sent&&st.left&&alarm({activeState:st.from}))){st.homed=true;st.homing=false;st.sent=false;}
      }
    }else if(id==='spindle'){
      var rpm=m&&m.fresh&&typeof m.spindleSpeed==='number'?m.spindleSpeed:null;
      if(rpm!==null){st.rpm=rpm;if(rpm>0)st.ran=true;else if(st.ran)st.stopped=true;}
    }else if(id==='aircut'){
      // Only a run seen during this step counts: the server keeps `finished` until the next load.
      var aircut=m&&String(m.originalName||m.name||'').indexOf('essai-en-l-air')===0;
      if(aircut&&m.workflow==='running')st.ran=true;
      if(aircut&&st.ran&&m.finished)st.finished=true;
    }
    return st;
  }
  function checked(st,names){return names.every(function(n){return !!(st.checks&&st.checks[n]);});}
  // Whether a step may be validated, and how ('ok' or 'manual'), or ''.
  function result(id,st){
    if(id==='prepare')return checked(st,['tool','area','estop'])?'ok':'';
    if(id==='backup')return st.downloaded?'ok':'';
    if(id==='estop')return st.back?'ok':(st.manual&&checked(st,['motors'])?'manual':'');
    if(id==='limits')return st.seen&&st.seen.X&&st.seen.Y&&st.seen.Z?'ok':'';
    if(id==='probe')return st.seen&&st.seen.P&&st.released&&st.released.P?'ok':'';
    if(id==='homing')return st.homed?'ok':'';
    if(id==='spindle')return st.ran&&st.stopped&&checked(st,['direction','noise','vfd'])?'ok':'';
    if(id==='aircut')return st.finished?'ok':(st.created&&checked(st,['ran'])?'manual':'');
    return 'ok';
  }
  function program(speed){
    return ['(CNCjs Touch - essai en l air : carre de 40 mm a Z0, SANS fraise)','(Origine X0 Y0 au centre, Z0 au moins 30 mm au-dessus de tout)',
      'G21 G90 G17 G94','G0 Z5','G0 X-20 Y-20','M3 S'+speed,'G4 P3','G1 Z0 F300','G1 X20 Y-20 F1000','G1 X20 Y20','G1 X-20 Y20','G1 X-20 Y-20',
      'G0 Z5','M5','G0 X0 Y0','M2',''].join('\n');
  }
  // Grbl settings as a $$ listing, in numeric order.
  function settingsText(data,port,date){
    var s=data&&data.settings||{};
    var keys=Object.keys(s).filter(function(k){return /^\$\d+$/.test(k);}).sort(function(a,b){return Number(a.slice(1))-Number(b.slice(1));});
    return ['; Réglages Grbl ($$) — '+port+' — '+date,'; '+(data&&data.firmware||'firmware inconnu')].concat(keys.map(function(k){return k+'='+s[k];})).join('\n')+'\n';
  }
  // A command the server accepted during a step. $X leaves an alarm for Idle without any
  // homing: after a $H that failed, it must not complete the homing step.
  function commandSent(id,st,detail,m){
    if(id!=='homing')return st;
    if(detail==='home'){st.sent=true;st.left=false;st.failed=false;st.from=m&&m.activeState||'';}
    else if(detail==='unlock'){st.sent=false;st.left=false;st.homing=false;}
    return st;
  }
  window.CNCCommissioning={STEPS:STEPS,observe:observe,result:result,program:program,settingsText:settingsText,commandSent:commandSent};

  if(typeof document==='undefined')return;
  var shell=window.cncShell,main=document.querySelector('main');
  if(!shell||!main||document.body.getAttribute('data-simulation')==='true')return;

  // ---- Storage: one entry per controller port ----
  function load(){try{var d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&typeof d==='object'&&d.machines&&typeof d.machines==='object')return d;}catch(_){}return {machines:{}};}
  var data=load();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch(_){}}
  function entry(port){return port&&Object.prototype.hasOwnProperty.call(data.machines,port)?data.machines[port]:null;}
  function stamp(){return new Date().toISOString();}
  function dateText(iso){try{return new Date(iso).toLocaleString(uiLocale.locale||'fr-FR');}catch(_){return iso;}}

  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function set(n,value){if(n.textContent!==value)n.textContent=value;}
  function button(label,cls,fn){var b=el('button',cls||'ks-secondary',label);b.type='button';b.addEventListener('click',fn);return b;}
  function prop(n,name,value){if(n[name]!==value)n[name]=value;}

  // ---- Screen ----
  var screen=el('section','screen');screen.id='screen-commissioning';screen.setAttribute('data-fit','scroll');
  var head=el('div','card wide ks-wiz-head'),headText=el('div'),title=el('h2','',''),progress=el('p','ks-wiz-progress','');
  headText.appendChild(title);headText.appendChild(progress);head.appendChild(headText);
  var skipAll=button(t('Passer l’assistant…'),'ks-secondary',function(){prop(skipBox,'hidden',false);skipCheck.checked=false;prop(skipConfirm,'disabled',true);});
  head.appendChild(skipAll);screen.appendChild(head);
  var dots=el('ol','ks-wiz-steps'),dotNodes=STEPS.map(function(id,i){var li=el('li','',String(i+1));li.title=TITLES[id];dots.appendChild(li);return li;});
  screen.appendChild(dots);
  var skipBox=el('div','card wide ks-wiz-warning');skipBox.hidden=true;
  skipBox.appendChild(el('p','',t('Sans ces vérifications, un arrêt d’urgence, une fin de course ou une broche mal câblés ne seront découverts qu’en plein travail. Vous pourrez relancer l’assistant depuis Réglages.')));
  var skipLabel=el('label','ks-wiz-check'),skipCheck=el('input');skipCheck.type='checkbox';skipLabel.appendChild(skipCheck);skipLabel.appendChild(el('span','',t('Je passe les vérifications sous ma responsabilité')));skipBox.appendChild(skipLabel);
  var skipConfirm=button(t('Passer l’assistant'),'ks-secondary ks-wiz-danger',function(){if(!skipCheck.checked)return;finish('skipped');});
  skipConfirm.disabled=true;skipCheck.addEventListener('change',function(){skipConfirm.disabled=!skipCheck.checked;});
  skipBox.appendChild(skipConfirm);skipBox.appendChild(button(t('Annuler'),'ks-secondary',function(){skipBox.hidden=true;}));
  screen.appendChild(skipBox);
  var body=el('div','card wide ks-wiz-body'),content=el('div','ks-wiz-content'),status=el('p','ks-wiz-status','');status.setAttribute('role','status');
  body.appendChild(content);body.appendChild(status);screen.appendChild(body);
  var nav=el('div','ks-wiz-nav');
  var prev=button(t('← Précédent'),'ks-secondary',function(){go(index-1);});
  var skipStep=button(t('Passer cette étape'),'ks-secondary',function(){record('skipped');go(index+1);});
  var next=button(t('Suivant →'),'ks-wiz-next',function(){
    if(STEPS[index]==='summary'){finish('done');return;}
    var r=result(STEPS[index],st);if(!r)return;record(r);go(index+1);
  });
  nav.appendChild(prev);nav.appendChild(skipStep);nav.appendChild(next);screen.appendChild(nav);
  main.appendChild(screen);

  var machine=null,port=null,index=0,st={},view=null,current='menu',autoDone=false;
  function jc(){return window.cncJobControls||null;}
  function shown(text){return window.cncI18n&&window.cncI18n.message?window.cncI18n.message(text):t(text);}
  function command(fn){var c=jc();if(!c)return;try{var p=fn(c);if(p&&typeof p.then==='function')p.then(function(r){if(r&&r.message)set(status,shown(r.message));},function(e){set(status,shown(e.message));});}catch(e){set(status,shown(e.message));}}
  function record(r){var e=entry(port);if(!e)return;e.results=e.results||{};e.results[STEPS[index]]=r;save();}
  function finish(how){
    if(!port){shell.go('menu');return;}
    var e=entry(port)||(data.machines[port]={});
    e.status=how;e.date=stamp();e.firmware=machine&&machine.firmware||e.firmware||'';e.step=0;save();
    if(how==='done'||how==='skipped')stopSpindle();
    skipBox.hidden=true;settingsCard();shell.go('menu');
  }
  // Sent whenever a start was asked on this step, whatever speed is observed:
  // the M3 may still be on its way, or the report may lack the FS field.
  function stopSpindle(){
    var c=jc();if(c&&typeof c.cancel==='function')c.cancel();
    if(!machine||!(machine.spindleSpeed>0||st.spindleAsked||st.ran))return;
    st.spindleAsked=false;command(function(c){return c.spindleStop();});
  }

  // Each view builds its controls once and refreshes them from the snapshot.
  function checkbox(name,label){var l=el('label','ks-wiz-check'),i=el('input');i.type='checkbox';i.checked=!!(st.checks&&st.checks[name]);
    i.addEventListener('change',function(){st.checks=st.checks||{};st.checks[name]=i.checked;refresh();});l.appendChild(i);l.appendChild(el('span','',label));return l;}
  function para(text,cls){return el('p',cls||'',text);}
  function lamp(label){var box=el('div','ks-wiz-lamp'),name=el('b','',label),state=el('span','','—');box.appendChild(name);box.appendChild(state);return {box:box,state:state};}
  function setLamp(l,text,cls){set(l.state,text);if(l.box.className!=='ks-wiz-lamp '+cls)l.box.className='ks-wiz-lamp '+cls;}
  var unlockButton=null;
  function unlockControl(){return button(t('Déverrouiller ($X)…'),'ks-secondary',function(){command(function(c){c.prepareCommand('unlock');});});}

  var VIEWS={
    prepare:function(box){
      box.appendChild(para(t('Cet assistant vérifie la machine pièce par pièce avant le premier travail. Il ne lance un mouvement ou la broche qu’après votre confirmation.')));
      box.appendChild(checkbox('tool',t('Aucune fraise dans la broche (pince vide ou retirée).')));
      box.appendChild(checkbox('area',t('Zone de travail dégagée : rien sur la table ni sur le chemin des axes.')));
      box.appendChild(checkbox('estop',t('Arrêt d’urgence à portée de main, je sais où il est.')));
      return function(){};
    },
    backup:function(box){
      box.appendChild(para(t('Gardez une copie des réglages de la carte ($$) avant toute modification : ils pourront être comparés ou ressaisis.')));
      var fw=para('','ks-wiz-strong'),count=para('');box.appendChild(fw);box.appendChild(count);
      var row=el('div','ks-wiz-row');
      var dl=button(t('Télécharger les réglages ($$)'),'ks-secondary',function(){
        command(function(c){return c.settings().then(function(r){
          var text=settingsText(r,port,stamp());
          window.CNCDownload.save(new Blob([text],{type:'text/plain'}),'reglages-grbl-'+String(port).replace(/[^A-Za-z0-9_-]+/g,'_')+'-'+stamp().slice(0,10)+'.txt');
          st.downloaded=true;refresh();return {message:t('Réglages téléchargés.')};
        });});
      });
      var reread=button(t('Relire les réglages ($$)'),'ks-secondary',function(){command(function(c){return c.readSettings();});});
      row.appendChild(dl);row.appendChild(reread);box.appendChild(row);
      return function(m){
        set(fw,t('Carte : ')+(m&&m.firmware||t('firmware non identifié')));
        var n=m?m.settingsCount||0:0;
        set(count,n?n+t(' réglages lus par CNCjs.'):t('Aucun réglage lu : touchez Relire les réglages, machine au repos.'));
        prop(dl,'disabled',!m||!n);prop(reread,'disabled',!m||!m.fresh||m.activeState!=='Idle'||m.workflow!=='idle');
      };
    },
    estop:function(box){
      var a=lamp(t('1. Appuyez sur l’arrêt d’urgence')),b=lamp(t('2. Relâchez-le, puis déverrouillez')),c=lamp(t('3. Machine revenue au repos'));
      box.appendChild(para(t('L’arrêt d’urgence doit mettre la carte en alarme (ou la réinitialiser). L’écran le détecte tout seul.')));
      [a,b,c].forEach(function(l){box.appendChild(l.box);});
      unlockButton=unlockControl();box.appendChild(unlockButton);
      var manual=el('div','ks-wiz-manual');manual.hidden=!st.manual;
      manual.appendChild(para(t('Si votre arrêt d’urgence coupe seulement l’alimentation des moteurs, la carte ne voit rien : vérifiez à la main qu’un axe ne tient plus quand il est enfoncé.')));
      manual.appendChild(checkbox('motors',t('Arrêt d’urgence enfoncé, les moteurs ne tiennent plus (vérifié à la main).')));
      var other=button(t('La carte ne voit pas mon arrêt d’urgence'),'ks-secondary',function(){st.manual=true;manual.hidden=false;other.hidden=true;refresh();});
      other.hidden=!!st.manual;box.appendChild(other);box.appendChild(manual);
      return function(m){
        setLamp(a,st.alarm||st.lost?t('Alarme détectée ✓'):alarm(m)&&!st.armed?t('Déjà en alarme : déverrouillez d’abord ($X)'):t('En attente…'),st.alarm||st.lost?'ok':alarm(m)?'act':'wait');
        setLamp(b,st.back?t('Fait ✓'):alarm(m)?t('Touchez Déverrouiller ($X)'):t('—'),st.back?'ok':alarm(m)?'act':'wait');
        setLamp(c,st.back?t('Idle ✓'):m?m.activeState||'—':t('Machine non disponible'),st.back?'ok':'wait');
        prop(unlockButton,'disabled',!m||!m.canUnlock);
      };
    },
    limits:function(box){
      box.appendChild(para(t('Appuyez à la main sur chaque fin de course, l’un après l’autre (les deux d’un même axe s’il y en a deux). Chaque axe se coche quand la carte voit le contact. Aucun mouvement.')));
      box.appendChild(para(t('Si les limites matérielles sont actives ($21=1), l’appui met la carte en alarme : c’est normal, déverrouillez ensuite.'),'ks-help'));
      var lamps={};['X','Y','Z'].forEach(function(a){lamps[a]=lamp(t('Axe ')+a);box.appendChild(lamps[a].box);});
      var warn=para('','ks-wiz-alert');box.appendChild(warn);
      unlockButton=unlockControl();box.appendChild(unlockButton);
      return function(m){
        var stuck=[];
        ['X','Y','Z'].forEach(function(a){
          var on=st.active&&st.active[a];
          if(on&&!st.free[a])stuck.push(a);
          setLamp(lamps[a],on===null||on===undefined?t('non lu'):(st.seen[a]?t('vu ✓'):'')+(on?t(' · CONTACT'):st.seen[a]?'':t('au repos')),st.seen[a]?'ok':on?'act':'wait');
        });
        set(warn,pins(m)===null?t('Contacts non lus : attendez un rapport récent de la carte.'):stuck.length?t('Contact actif sans appui : ')+stuck.join(', ')+t('. Vérifiez le câblage ou l’inversion des entrées ($5).'):'');
        prop(unlockButton,'disabled',!m||!m.canUnlock);unlockButton.hidden=!alarm(m);
      };
    },
    probe:function(box){
      box.appendChild(para(t('Branchez la sonde, puis touchez la plaque avec la pince (ou la fraise reliée). Le contact doit s’afficher, puis disparaître quand vous la relâchez.')));
      var l=lamp(t('Sonde (P)'));box.appendChild(l.box);
      var warn=para('','ks-wiz-alert');box.appendChild(warn);
      return function(m){
        var on=st.active&&st.active.P;
        setLamp(l,on===null||on===undefined?t('non lue'):on?t('CONTACT'):(st.seen.P?t('vu puis relâché ✓'):t('libre')),result('probe',st)?'ok':on?'act':'wait');
        set(warn,on&&!st.free.P?t('Contact actif sans appui : vérifiez la sonde ou l’inversion de l’entrée ($6).'):'');
      };
    },
    homing:function(box){
      box.appendChild(para(t('La machine va se déplacer seule vers ses fins de course (Z d’abord), puis s’en dégager.')));
      box.appendChild(para(t('Gardez la main sur l’arrêt d’urgence. Appuyez si un axe part dans le mauvais sens ou ne s’arrête pas au contact.'),'ks-wiz-alert'));
      box.appendChild(checkbox('hand',t('Main sur l’arrêt d’urgence, zone dégagée.')));
      var start=button(t('Lancer la prise d’origine ($H)…'),'ks-wiz-next',function(){command(function(c){c.prepareCommand('home');});});box.appendChild(start);
      var state=para('','ks-wiz-strong'),why=para('','ks-help');box.appendChild(state);box.appendChild(why);
      unlockButton=unlockControl();box.appendChild(unlockButton);
      return function(m){
        prop(start,'disabled',!checked(st,['hand'])||!m||!m.canHome);
        set(why,m&&!m.canHome?m.homeReason||'':'');
        set(state,st.homed?t('Prise d’origine terminée ✓'):st.homing||st.sent?t('Prise d’origine en cours…'):st.failed?t('Échec : alarme pendant la prise d’origine (contact non trouvé ?). Déverrouillez, vérifiez la fin de course puis relancez.'):'');
        prop(unlockButton,'disabled',!m||!m.canUnlock);unlockButton.hidden=!alarm(m);
      };
    },
    spindle:function(box){
      box.appendChild(checkbox('empty',t('Aucune fraise dans la pince ; écrou de pince bien serré ou retiré.')));
      box.appendChild(checkbox('clear',t('Variateur sous tension, câbles et mains loin de la broche.')));
      var row=el('div','ks-wiz-row');
      var start=button('','ks-wiz-next',function(){st.spindleAsked=true;command(function(c){c.prepareCommand('spindle');});});
      var stop=button(t('Arrêter la broche (M5)'),'ks-secondary ks-wiz-danger',function(){command(function(c){return c.spindleStop();});});
      row.appendChild(start);row.appendChild(stop);box.appendChild(row);
      var live=para('','ks-wiz-strong'),note=para(t('Grbl affiche la vitesse demandée, pas une mesure : comparez avec la fréquence du variateur (24 000 tr/min = 400 Hz, soit 1 Hz pour 60 tr/min).'),'ks-help');
      box.appendChild(live);box.appendChild(note);
      var after=el('div','ks-wiz-manual');
      after.appendChild(checkbox('direction',t('Sens de rotation correct (horaire, vu du dessus).')));
      after.appendChild(checkbox('noise',t('Pas de bruit ni de vibration anormaux.')));
      var vfd=checkbox('vfd','');after.appendChild(vfd);box.appendChild(after);
      var why=para('','ks-help');box.appendChild(why);
      return function(m){
        var speed=m&&m.spindleTestSpeed;
        set(start,speed?t('Démarrer à ')+speed+t(' tr/min…'):t('Démarrer la broche…'));
        set(vfd.lastChild,t('Le variateur affiche environ ')+(speed?Math.round(speed/60):'—')+t(' Hz.'));
        prop(start,'disabled',!checked(st,['empty','clear'])||!m||!m.canSpindleTest||st.rpm>0);
        prop(stop,'disabled',!m||!m.canSpindleStop);
        set(live,st.rpm>0?t('Broche : ')+st.rpm+t(' tr/min demandés'):st.ran?t('Broche arrêtée ✓'):t('Broche à l’arrêt'));
        after.hidden=!st.ran;
        set(why,m&&!m.canSpindleTest&&!(st.rpm>0)?m.spindleReason||'':'');
      };
    },
    aircut:function(box){
      box.appendChild(para(t('Dernier essai : un vrai programme, broche à vitesse mini, outil en l’air. Il trace un carré de 40 mm autour de l’origine, sans descendre sous Z 0.')));
      var steps=el('ol','ks-wiz-list');
      [t('Ajoutez le fichier d’essai à la bibliothèque.'),t('Dans CNCjs, placez la broche (sans fraise) au-dessus du centre de la table, à 30 mm au moins au-dessus de tout, et mettez X, Y et Z à zéro à cet endroit.'),
        t('Dans Fichiers, choisissez essai-en-l-air, chargez-le et démarrez, main sur l’arrêt d’urgence.')].forEach(function(s){steps.appendChild(el('li','',s));});
      box.appendChild(steps);
      var row=el('div','ks-wiz-row');
      var add=button(t('Ajouter le fichier d’essai'),'ks-secondary',function(){
        if(typeof window.cncLibraryImport!=='function'){set(status,t('Bibliothèque indisponible.'));return;}
        add.disabled=true;set(status,t('Envoi du fichier d’essai…'));
        window.cncLibraryImport(TEST_FILE,program(machine&&machine.spindleTestSpeed||6000)).then(function(){st.created=true;set(status,t('Fichier d’essai ajouté à la bibliothèque.'));refresh();},
          function(e){add.disabled=false;set(status,e.message);});
      });
      row.appendChild(add);row.appendChild(button(t('Ouvrir Fichiers →'),'ks-secondary',function(){shell.go('files');}));box.appendChild(row);
      var state=para('','ks-wiz-strong');box.appendChild(state);
      var manual=checkbox('ran',t('Le programme s’est déroulé normalement jusqu’au bout.'));box.appendChild(manual);
      return function(){
        add.disabled=!!st.created;
        set(state,st.finished?t('Programme d’essai terminé ✓'):st.created?t('Fichier prêt : lancez-le depuis Fichiers.'):'');
        manual.hidden=!st.created||!!st.finished;
      };
    },
    summary:function(box){
      var e=entry(port)||{},results=e.results||{};
      var list=el('ul','ks-wiz-summary');
      STEPS.slice(0,-1).forEach(function(id){
        var r=results[id],li=el('li',r==='ok'?'ok':r==='manual'?'manual':'skipped');
        li.appendChild(el('b','',TITLES[id]));li.appendChild(el('span','',r==='ok'?t('vérifié ✓'):r==='manual'?t('vérifié à la main'):t('passé')));list.appendChild(li);
      });
      box.appendChild(list);
      box.appendChild(para(t('Touchez Terminer pour enregistrer ce bilan avec la date. Vous pourrez relancer l’assistant depuis Réglages.')));
      return function(){};
    }
  };

  function refresh(){
    if(!view)return;
    view(machine);
    var id=STEPS[index],ok=id==='summary'?true:!!result(id,st);
    prop(next,'disabled',!ok);set(next,id==='summary'?t('Terminer ✓'):t('Suivant →'));
    prop(prev,'disabled',index===0);skipStep.hidden=id==='summary';
  }
  function go(i){
    if(STEPS[index]==='spindle'&&i!==index)stopSpindle();
    index=Math.max(0,Math.min(STEPS.length-1,i));st={};unlockButton=null;
    var e=entry(port);if(e){e.step=index;save();}
    var id=STEPS[index];
    set(title,TITLES[id]);set(progress,t('Mise en service · étape ')+(index+1)+' / '+STEPS.length+(port?' · '+port:''));
    dotNodes.forEach(function(d,k){var r=e&&e.results&&e.results[STEPS[k]];var cls=k===index?'current':r==='skipped'?'skipped':r?'ok':'';if(d.className!==cls)d.className=cls;});
    content.textContent='';set(status,'');skipBox.hidden=true;
    view=VIEWS[id](content);observe(id,st,machine);refresh();
  }
  // Opens the assistant for the selected controller, resuming a run in progress.
  function open(){
    if(!port){set(settingsStatus,t('Aucune machine connectée : connectez-la dans CNCjs.'));return;}
    var e=entry(port);
    if(!e||e.status!=='progress'){e=data.machines[port]={status:'progress',step:0,results:{},started:stamp()};save();}
    shell.go('commissioning');go(e.step||0);
  }

  // ---- Réglages card and Machine screen buttons ----
  var settingsPanel=document.getElementById('screen-settings'),settingsStatus=el('p','',''),settingsButton=null;
  if(settingsPanel){
    var card=el('div','card ks-display-card ks-commissioning-card');card.appendChild(el('h2','',t('Mise en service de la machine')));
    card.appendChild(settingsStatus);settingsButton=button(t('Lancer l’assistant'),'ks-secondary',open);card.appendChild(settingsButton);
    card.appendChild(el('p','ks-help',t('Arrêt d’urgence, fins de course, sonde, prise d’origine, broche et fichier d’essai, étape par étape.')));
    var intro=settingsPanel.querySelector&&settingsPanel.querySelector('.ks-panel-intro');
    var tabs=settingsPanel.querySelector&&settingsPanel.querySelector('.ks-settings-tabs');
    var anchor=tabs||intro;settingsPanel.insertBefore(card,anchor&&anchor.nextSibling||null);
  }
  function settingsCard(){
    var e=entry(port);
    set(settingsStatus,!port?t('Aucune machine connectée.'):!e?t('Jamais faite pour ')+port+'.':e.status==='done'?t('Faite le ')+dateText(e.date)+' · '+port:
      e.status==='skipped'?t('Passée le ')+dateText(e.date)+t(' sous la responsabilité de l’opérateur.'):t('En cours : étape ')+((e.step||0)+1)+' / '+STEPS.length+'.');
    if(settingsButton)set(settingsButton,e&&e.status==='progress'?t('Reprendre l’assistant'):e?t('Relancer l’assistant'):t('Lancer l’assistant'));
  }
  var overview=document.querySelector('.ks-machine-overview'),machineUnlock=null,machineHome=null;
  if(overview&&overview.appendChild){
    var tools=el('div','ks-wiz-row ks-machine-commands');
    machineUnlock=button(t('Déverrouiller ($X)…'),'ks-secondary',function(){command(function(c){c.prepareCommand('unlock');});});
    machineHome=button(t('Prise d’origine ($H)…'),'ks-secondary',function(){command(function(c){c.prepareCommand('home');});});
    tools.appendChild(machineUnlock);tools.appendChild(machineHome);tools.appendChild(button(t('Mise en service…'),'ks-secondary',open));
    overview.appendChild(tools);
  }

  window.addEventListener('cnc-command-sent',function(e){
    if(!view||!e)return;
    commandSent(STEPS[index],st,e.detail,machine);refresh();
  });
  window.addEventListener('cnc-screen-change',function(e){
    var was=current;current=e&&e.detail;
    if(was==='commissioning'&&current!=='commissioning'){stopSpindle();view=null;}
  });
  window.addEventListener('cnc-job-status',function(e){
    var d=e&&e.detail||{};if(d.simulation)return;
    machine=d.machine||null;
    if(machine&&machine.port!==port){port=machine.port;settingsCard();}
    if(machineUnlock){prop(machineUnlock,'disabled',!machine||!machine.canUnlock);prop(machineUnlock,'title',machine&&machine.unlockReason||'');}
    if(machineHome){prop(machineHome,'disabled',!machine||!machine.canHome);prop(machineHome,'title',machine&&machine.homeReason||'');}
    if(view){observe(STEPS[index],st,machine);refresh();}
    // First real controller seen on this port: open the assistant once, from the menu.
    if(!autoDone&&machine&&machine.fresh&&machine.workflow==='idle'&&!/sim/i.test(machine.port)&&!entry(machine.port)&&(current==='menu'||current==='home')){
      autoDone=true;open();
    }
  });
  settingsCard();
  // status(): for the menu tile. 'unknown' (no controller), 'none', 'progress', 'done' or 'skipped'.
  window.cncCommissioning={open:open,status:function(){var e=port?entry(port):null;return {port:port,state:!port?'unknown':!e?'none':e.status};}};
})();
