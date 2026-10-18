(function(root){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;}};
  var t=function(s){return uiLocale.t(s);};
  // Grbl acknowledges a line when it enters its planner, up to ~15 moves before
  // it is executed: a resume after a stop starts that far back.
  var PLANNER_MARGIN=15;
  function spindleText(s){return s?s.mode+' S'+s.speed:'';}
  // What Suivi says while the program itself holds the job (M0, M1, M6, error).
  function pauseText(p){
    if(!p)return '';
    if(p.kind==='M6')return t('Changement d’outil')+(p.tool!==null&&p.tool!==undefined?' T'+p.tool:'')+t(' : attendez l’arrêt, arrêtez la broche (M5), changez l’outil et refaites le zéro Z si sa longueur change, puis touchez Reprendre.')+
      (p.restartSpindle?t(' La broche sera relancée (')+spindleText(p.restartSpindle)+t(', 3 s) avant la reprise.'):'');
    if(p.kind==='M0'||p.kind==='M1')return t('Pause demandée par le programme (')+p.kind+')'+(p.message?' : '+p.message:'')+t('. Touchez Reprendre quand vous êtes prêt.');
    if(p.kind==='error')return t('Pause sur une erreur Grbl : arrêtez le travail, corrigez la cause, puis reprenez à une ligne.');
    return '';
  }
  // Plate probe parameters of the confirmation being prepared (set by the panel below).
  var pendingPlate=null;
  function plateNote(p){
    return t('Plaque de ')+p.thickness+t(' mm posée sous l’outil et sonde branchée ? Descente de ')+p.search+t(' mm au plus ; le dessus de la plaque deviendra Z = épaisseur, puis l’outil remontera 5 mm au-dessus.');
  }
  function lastZeroText(z){
    if(!z)return '';
    if(z.failed)return t('Dernier palpage échoué : ')+z.failed;
    return t('Dernier zéro Z : plaque ')+z.thickness+t(' mm, repère ')+z.wcs+t(', contact à Z machine ')+z.machineZ+'.';
  }
  // Extra line in the confirmation dialog.
  function dialogNote(operation,c){
    if(operation==='zeroZ')return pendingPlate?plateNote(pendingPlate):'';
    if(!c)return '';
    var p=c.programPause;
    if(operation==='resume'&&p&&p.kind==='M6')return t('Outil')+(p.tool!==null&&p.tool!==undefined?' T'+p.tool:'')+t(' en place et zéro Z vérifié ?')+(p.restartSpindle?t(' La broche sera relancée (')+spindleText(p.restartSpindle)+t(', 3 s) avant la reprise.'):'');
    if(operation==='start'&&c.resume){var r=c.resume;
      return t('Reprise à la ligne ')+r.from+' / '+r.total+' : '+r.line+(r.tool!==null&&r.tool!==undefined?t(' — outil attendu T')+r.tool:'')+t('. La machine monte à la hauteur de dégagement, se place en XY, relance la broche puis plonge.');}
    return '';
  }
  function suggestedLine(c,file){
    if(!c||typeof c.stoppedAtLine!=='number'||c.stoppedFile!==file)return null;
    return Math.max(2,c.stoppedAtLine-PLANNER_MARGIN);
  }
  function planText(plan){
    var parts=[t('Ligne ')+plan.from+' / '+plan.total+' : '+plan.line+'.'];
    parts.push(t('Départ : Z ')+plan.safeZ+t(', puis X ')+plan.position.X+' Y '+plan.position.Y+t(', plongée à Z ')+plan.position.Z+'.');
    if(plan.spindle)parts.push(t('Broche ')+spindleText(plan.spindle)+t(' relancée 3 s avant la plongée.'));
    if(plan.coolant)parts.push(t('Arrosage ')+plan.coolant+'.');
    if(plan.tool!==null&&plan.tool!==undefined)parts.push(t('Outil attendu : T')+plan.tool+t(' (vérifiez qu’il est en place et que le zéro Z lui correspond).'));
    return parts.join(' ');
  }
  var api={pauseText:pauseText,dialogNote:dialogNote,suggestedLine:suggestedLine,planText:planText,plateNote:plateNote,lastZeroText:lastZeroText,PLANNER_MARGIN:PLANNER_MARGIN,
    setPendingPlate:function(p){pendingPlate=p;}};
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  root.CNCJobResume=api;
  var ready=document.getElementById('home-job-ready');if(!ready)return;
  var simulation=document.body.getAttribute('data-simulation')==='true';
  if(simulation)return; // the simulation has no file to rebuild nor real program pauses
  function el(tag,id,cls,text){var e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;if(text)e.textContent=t(text);return e;}
  function after(ref,node){var p=ref.parentNode;if(!p)return;if(ref.nextSibling)p.insertBefore(node,ref.nextSibling);else p.appendChild(node);}
  // Program pause notice with the M5 button.
  var pause=el('div','home-program-pause','t-notice'),pauseText_=el('p','home-program-pause-text'),m5=el('button','home-pause-m5','t-btn t-btn--warn','Arrêter la broche (M5)');
  pause.setAttribute('data-tone','warn');pause.setAttribute('role','status');pause.hidden=true;m5.hidden=true;pause.appendChild(pauseText_);pause.appendChild(m5);
  // Resume from a line.
  var open=el('button','home-resume-line','t-btn','Reprendre à une ligne…'),panel=el('div','home-resume-panel','t-card'),
    label=el('label','home-resume-label','','Ligne de reprise'),input=el('input','home-resume-input'),hint=el('p','home-resume-hint','t-help'),
    check=el('button','home-resume-check','t-btn','Vérifier'),load=el('button','home-resume-load','t-btn t-btn--primary','Charger la reprise'),
    cancel=el('button','home-resume-cancel','t-btn t-btn--ghost','Annuler'),plan=el('p','home-resume-plan','t-help');
  input.setAttribute('type','number');input.setAttribute('min','2');input.setAttribute('inputmode','numeric');
  plan.setAttribute('role','status');open.hidden=true;panel.hidden=true;load.disabled=true;
  [label,input,hint,check,load,cancel,plan].forEach(function(n){panel.appendChild(n);});
  // Z zero with a touch plate: thickness and search distance, remembered on this device.
  var plate=el('div','home-plate','t-card'),plateTitle=el('p','home-plate-title','','Zéro Z avec une plaque'),
    thickLabel=el('label','home-plate-thickness-label','','Épaisseur de la plaque (mm)'),thick=el('input','home-plate-thickness'),
    searchLabel=el('label','home-plate-search-label','','Descente maximale (mm)'),search=el('input','home-plate-search'),
    probe=el('button','home-plate-probe','t-btn','Palper le zéro Z…'),plateHelp=el('p','home-plate-help','t-help','Posez la plaque sur la pièce sous l’outil et branchez la sonde. Descente à 100 mm/min, recul 1 mm, seconde touche à 25 mm/min ; le dessus de la plaque devient Z = épaisseur, puis l’outil remonte 5 mm au-dessus.'),
    plateLast=el('p','home-plate-last','t-help'),plateStatus=el('p','home-plate-status','t-notice');
  [thick,search].forEach(function(i){i.setAttribute('type','number');i.setAttribute('step','0.01');i.setAttribute('inputmode','decimal');});
  plateStatus.setAttribute('role','status');plate.hidden=true;
  [plateTitle,thickLabel,thick,searchLabel,search,probe,plateHelp,plateLast,plateStatus].forEach(function(n){plate.appendChild(n);});
  var PLATE_KEY='cncjs-touch-plate-v1';
  function loadPlate(){try{var v=JSON.parse(localStorage.getItem(PLATE_KEY)||'null');if(v&&typeof v==='object'){thick.value=v.thickness>0?String(v.thickness):'';search.value=v.search>0?String(v.search):'10';return;}}catch(_){}
    thick.value='';search.value='10';}
  function savePlate(p){try{localStorage.setItem(PLATE_KEY,JSON.stringify(p));}catch(_){}}
  function numberOf(v){var n=Number(String(v).replace(',','.'));return isFinite(n)?n:NaN;}
  loadPlate();
  after(ready,pause);after(pause,open);after(open,panel);after(panel,plate);
  var machine=null,selection=window.cncLibrarySelection||null,checked=null,sequence=0;
  function controls(){return window.cncJobControls;}
  function set(node,key,value){if(node[key]!==value)node[key]=value;}
  function canResumeFromLine(){return !!(machine&&selection&&machine.fresh&&machine.workflow==='idle'&&machine.canLoad);}
  function close(){panel.hidden=true;checked=null;sequence++;set(load,'disabled',true);set(plan,'textContent','');}
  function render(){
    var p=machine&&machine.programPause;
    var text=pauseText(p);if(p&&p.kind==='M6'&&machine.canZeroZ)text+=t(' Le zéro Z avec la plaque se règle ci-dessous.');
    set(pause,'hidden',!p||!text);set(pauseText_,'textContent',text);
    set(plate,'hidden',!(machine&&(machine.canZeroZ||machine.probing)));
    set(probe,'disabled',!(machine&&machine.canZeroZ));
    set(plateLast,'textContent',lastZeroText(machine&&machine.zeroZ));
    set(plateStatus,'textContent',machine&&machine.probing?t('Palpage en cours… Arrêter interrompt.'):'');
    set(m5,'hidden',!(p&&machine.canSpindleStop&&machine.spindleSpeed>0));
    var can=canResumeFromLine();set(open,'hidden',!can||!panel.hidden);
    // A job that starts closes the panel; a passing refusal (an M5 or a $G on
    // its way) only disables the load and keeps the check.
    if(!panel.hidden&&(!machine||!selection||machine.workflow!=='idle'))close();
    else set(load,'disabled',!checked||!can);
  }
  function line(){var n=Number(input.value);return Number.isInteger(n)&&n>=2?n:null;}
  open.addEventListener('click',function(){
    if(!canResumeFromLine())return;
    var s=suggestedLine(machine,selection.file);input.value=s===null?'':String(s);
    set(hint,'textContent',typeof machine.stoppedAtLine==='number'&&machine.stoppedFile===selection.file?
      t('Dernier arrêt après la ligne ')+machine.stoppedAtLine+t(' (acquittée). Grbl exécute jusqu’à 15 mouvements plus tard : ligne proposée ')+s+'.':
      t('Numéro de ligne tel qu’affiché pendant le travail (lignes non vides).'));
    panel.hidden=false;render();
  });
  cancel.addEventListener('click',function(){close();render();});
  input.addEventListener('input',function(){checked=null;set(load,'disabled',true);set(plan,'textContent','');});
  check.addEventListener('click',function(){
    var n=line(),c=controls(),own=++sequence;
    if(n===null){set(plan,'textContent',t('Indiquez une ligne (2 ou plus).'));return;}
    if(!c||typeof c.resumePlan!=='function')return;
    set(plan,'textContent',t('Vérification…'));
    c.resumePlan(selection.file,n).then(function(data){if(own!==sequence)return;checked={file:selection.file,line:n};set(plan,'textContent',planText(data));set(load,'disabled',false);},
      function(e){if(own!==sequence)return;checked=null;set(load,'disabled',true);set(plan,'textContent',e.message);});
  });
  load.addEventListener('click',function(){
    var c=controls();if(!checked||!c||typeof c.loadFrom!=='function'||load.disabled)return;
    var target=checked;set(load,'disabled',true);
    c.loadFrom(target.file,target.line).then(function(){close();render();},function(e){set(plan,'textContent',e.message);set(load,'disabled',false);});
  });
  probe.addEventListener('click',function(){
    var c=controls();if(!c||typeof c.prepareCommand!=='function'||probe.disabled)return;
    var th=numberOf(thick.value),se=numberOf(search.value);
    if(!(th>0&&th<=50)){set(plateStatus,'textContent',t('Indiquez l’épaisseur de la plaque (mm).'));return;}
    if(!(se>=1&&se<=100)){set(plateStatus,'textContent',t('Descente maximale invalide (1 à 100 mm).'));return;}
    var params={thickness:Math.round(th*1000)/1000,search:Math.round(se*1000)/1000};
    savePlate(params);pendingPlate=params;set(plateStatus,'textContent','');
    c.prepareCommand('zeroZ',params);
  });
  m5.addEventListener('click',function(){var c=controls();if(c&&typeof c.spindleStop==='function')c.spindleStop().catch(function(){});});
  window.addEventListener('cnc-job-status',function(e){var d=e&&e.detail||{};if(d.simulation)return;machine=d.machine||null;render();});
  window.addEventListener('cnc-library-select',function(e){selection=e&&e.detail||null;if(checked&&(!selection||checked.file!==selection.file))close();render();});
  render();
})(typeof window==='object'?window:this);
