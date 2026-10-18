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
  // Extra line in the confirmation dialog.
  function dialogNote(operation,c){
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
  var api={pauseText:pauseText,dialogNote:dialogNote,suggestedLine:suggestedLine,planText:planText,PLANNER_MARGIN:PLANNER_MARGIN};
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
  after(ready,pause);after(pause,open);after(open,panel);
  var machine=null,selection=window.cncLibrarySelection||null,checked=null,sequence=0;
  function controls(){return window.cncJobControls;}
  function set(node,key,value){if(node[key]!==value)node[key]=value;}
  function canResumeFromLine(){return !!(machine&&selection&&machine.fresh&&machine.workflow==='idle'&&machine.canLoad);}
  function close(){panel.hidden=true;checked=null;sequence++;set(load,'disabled',true);set(plan,'textContent','');}
  function render(){
    var p=machine&&machine.programPause;
    set(pause,'hidden',!p||!pauseText(p));set(pauseText_,'textContent',pauseText(p));
    set(m5,'hidden',!(p&&machine.canSpindleStop&&machine.spindleSpeed>0));
    var can=canResumeFromLine();set(open,'hidden',!can||!panel.hidden);
    if(!can&&!panel.hidden)close();
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
  m5.addEventListener('click',function(){var c=controls();if(c&&typeof c.spindleStop==='function')c.spindleStop().catch(function(){});});
  window.addEventListener('cnc-job-status',function(e){var d=e&&e.detail||{};if(d.simulation)return;machine=d.machine||null;render();});
  window.addEventListener('cnc-library-select',function(e){selection=e&&e.detail||null;if(checked&&(!selection||checked.file!==selection.file))close();render();});
  render();
})(typeof window==='object'?window:this);
