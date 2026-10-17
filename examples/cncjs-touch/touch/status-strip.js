/* Status strip (UI 2027): the machine state is visible on every screen. One
 * row in the page header: Grbl state as a word and a colour, report age,
 * spindle and feed, loaded file, and Pause / Stop while a job runs. It only
 * projects the `cnc-job-status` detail already published by job-controls.js
 * (no timer, no request); Pause and Stop relay to the existing #job-pause and
 * #job-stop buttons, so every guard and confirmation stays where it is. */
(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;},locale:'fr-FR'};
  var simulation=document.body.getAttribute('data-simulation')==='true';
  var banner=document.getElementById(simulation?'simulation-banner':'real-banner');
  if(!banner)return;
  var $=function(id){return document.getElementById(id);};
  function el(tag,cls,id){var n=document.createElement(tag);if(cls)n.className=cls;if(id)n.id=id;return n;}
  function text(node,value){if(node&&node.textContent!==value)node.textContent=value;}
  function attr(node,name,value){if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
  function prop(node,key,value){if(node[key]!==value)node[key]=value;}
  // Icons: one shape per tone, so the state is never carried by colour alone.
  var icons={ok:'M4 12l5 5L20 6',run:'M7 5l12 7-12 7z',warn:'M8 5h3v14H8z M13 5h3v14h-3z',danger:'M12 3L2 21h20z M12 9v5 M12 17v1',off:'M5 5l14 14M19 5L5 19',info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5 M12 8v.5'};
  var state=el('div','t-state','t-state');state.setAttribute('data-tone','off');state.setAttribute('role','status');state.setAttribute('aria-live','polite');
  state.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+icons.off+'"/></svg>';
  var stateText=el('span','','t-state-text');state.appendChild(stateText);
  var fresh=el('span','t-fresh','t-fresh');fresh.setAttribute('data-stale','true');fresh.appendChild(el('i'));
  var freshText=el('span','','t-fresh-text');fresh.appendChild(freshText);fresh.title=uiLocale.t('Âge du dernier rapport machine');
  var vitals=el('div','t-vitals');
  function vital(label,id,extra){var box=el('div','t-vital'+(extra||''));var l=el('span');l.textContent=label;var b=el('b','',id);b.textContent='—';box.appendChild(l);box.appendChild(b);vitals.appendChild(box);return b;}
  var spindle=vital(uiLocale.t('Broche'),'t-spindle'),feed=vital(uiLocale.t('Avance'),'t-feed'),file=vital(uiLocale.t('Fichier'),'t-file',' t-vital--file');
  var actions=el('div','t-strip-actions');
  var pause=el('button','t-btn t-btn--warn','t-pause');pause.type='button';pause.textContent=uiLocale.t('Pause');pause.hidden=true;
  var stop=el('button','t-btn t-btn--danger','t-stop');stop.type='button';stop.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
  var stopText=el('span');stopText.textContent=uiLocale.t('Arrêter');stop.appendChild(stopText);stop.hidden=true;
  actions.appendChild(pause);actions.appendChild(stop);
  // Before the title and the right-hand group written by touch-shell.js.
  var first=banner.firstChild||null;[state,fresh,vitals,actions].forEach(function(node){banner.insertBefore(node,first);});
  function relay(id){var source=$(id);if(source&&!source.disabled)source.click();}
  pause.addEventListener('click',function(){relay('job-pause');});
  stop.addEventListener('click',function(){relay('job-stop');});
  function number(v){try{return Math.round(v).toLocaleString(uiLocale.locale||'fr-FR');}catch(_){return String(Math.round(v));}}
  function finite(v){return typeof v==='number'&&isFinite(v);}
  // Grbl state → word and tone. The word says what the machine does; the tone
  // follows the colour rules (green safe, amber attention, red alarm, blue info).
  function describe(m,connected){
    if(!m||!connected)return {word:uiLocale.t('Hors ligne'),tone:'off'};
    var a=String(m.activeState||'');
    if(/^alarm/i.test(a))return {word:uiLocale.t('Alarme')+(finite(m.alarmCode)?' '+m.alarmCode:''),tone:'danger'};
    if(!m.fresh)return {word:uiLocale.t('Rapport ancien'),tone:'warn'};
    if(/^hold/i.test(a))return {word:uiLocale.t('Pause'),tone:'warn'};
    if(/^door/i.test(a))return {word:uiLocale.t('Porte ouverte'),tone:'warn'};
    if(/^run/i.test(a))return {word:uiLocale.t('En cours'),tone:'run'};
    if(/^home/i.test(a))return {word:uiLocale.t('Prise d’origine'),tone:'run'};
    if(/^jog/i.test(a))return {word:uiLocale.t('Déplacement'),tone:'run'};
    if(/^check/i.test(a))return {word:uiLocale.t('Vérification'),tone:'info'};
    if(/^sleep/i.test(a))return {word:uiLocale.t('Veille'),tone:'off'};
    if(/^idle/i.test(a))return {word:uiLocale.t('Repos'),tone:'ok'};
    return {word:a||uiLocale.t('Inconnu'),tone:'info'};
  }
  var tone='';
  function render(detail){
    var m=detail.machine,connected=simulation?!!m:!!detail.transportConnected&&!!m;
    var d=describe(m,connected);
    text(stateText,d.word);
    if(d.tone!==tone){tone=d.tone;attr(state,'data-tone',tone);state.querySelector('path').setAttribute('d',icons[tone]);}
    var age=m&&m.statusAgeMs,known=finite(age)&&age>=0;
    text(freshText,simulation&&m?uiLocale.t('simulé'):!known?'—':age<1000?(age/1000).toFixed(1).replace('.',',')+' s':age<60000?Math.ceil(age/1000)+' s':Math.ceil(age/60000)+' min');
    attr(fresh,'data-stale',String(!m||(!simulation&&(!known||age>2500||!m.fresh))));
    var live=!!(m&&m.fresh);
    text(spindle,live&&finite(m.spindleSpeed)?number(m.spindleSpeed)+uiLocale.t(' tr/min'):'—');
    text(feed,live&&finite(m.feedrate)?number(m.feedrate)+' mm/min':'—');
    text(file,m&&m.name?(m.originalName||m.name):'—');
    var running=!!(m&&m.workflow&&m.workflow!=='idle');
    prop(pause,'hidden',!running);prop(stop,'hidden',!running);
    // During a job the page switch link gives its room to the file name (and is not to be tapped then).
    attr(banner,'data-job',String(running));
    prop(pause,'disabled',!m||!m.canPause);prop(stop,'disabled',!m||!m.canStop);
  }
  var disposed=false;
  function onStatus(e){if(disposed||!e.detail||!!e.detail.simulation!==simulation)return;render(e.detail);}
  window.addEventListener('cnc-job-status',onStatus);
  function leave(e){if(e&&e.persisted)return;disposed=true;window.removeEventListener('cnc-job-status',onStatus);window.removeEventListener('pagehide',leave);}
  window.addEventListener('pagehide',leave);
  render({machine:null,transportConnected:false});
  window.cncStatusStrip={render:render,describe:describe};
})();
