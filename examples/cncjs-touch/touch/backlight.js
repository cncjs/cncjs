/* Réglages → Affichage → Luminosité: backlight of the screen attached to the
 * computer running CNCjs (the tablet itself in the kiosk setup), through
 * GET/POST /api/touch-backlight. One request at a time while the slider moves;
 * the last position always wins. During the screen saver the panel can be
 * turned off or dimmed to the minimum (a temporary level the server never
 * stores) and is put back on the first touch. Nothing is sent to the controller. */
(function () {
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;}};
  var t=uiLocale.t;
  var panel=document.getElementById('screen-settings');
  if(!panel)return;
  var MIN=5,STEP=5,KEY='cncjs-touch-backlight-v1',MODES=['off','min','keep'];
  var mode='off';
  try{var saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&MODES.indexOf(saved.sleep)>=0)mode=saved.sleep;}catch(_){}

  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function set(n,value){if(n.textContent!==value)n.textContent=value;}

  var card=el('div','card ks-display-card ks-backlight');card.id='ks-backlight';
  card.appendChild(el('h2','',t('Luminosité')));
  card.appendChild(el('p','',t('Rétroéclairage de l’écran branché sur l’ordinateur qui exécute CNCjs.')));
  var row=el('div','ks-backlight-row');
  var down=el('button','ks-secondary ks-backlight-step','−'),up=el('button','ks-secondary ks-backlight-step','+');
  down.type=up.type='button';down.setAttribute('aria-label',t('Moins lumineux'));up.setAttribute('aria-label',t('Plus lumineux'));
  var slider=el('input','ks-backlight-slider');slider.type='range';slider.min=String(MIN);slider.max='100';slider.step=String(STEP);slider.value='50';
  slider.setAttribute('aria-label',t('Luminosité'));
  var value=el('b','ks-backlight-value','—');
  row.appendChild(down);row.appendChild(slider);row.appendChild(up);row.appendChild(value);card.appendChild(row);
  var sleepRow=el('label','ks-backlight-sleep');sleepRow.appendChild(el('span','',t('Pendant la veille')));
  var sleepSelect=el('select','ks-backlight-mode');sleepSelect.setAttribute('aria-label',t('Luminosité pendant la veille'));
  [['off',t('Écran éteint')],['min',t('Luminosité minimale')],['keep',t('Inchangée')]].forEach(function(o){var opt=el('option','',o[1]);opt.value=o[0];sleepSelect.appendChild(opt);});
  sleepSelect.value=mode;sleepRow.appendChild(sleepSelect);card.appendChild(sleepRow);
  var status=el('p','ks-help ks-backlight-status','');status.setAttribute('role','status');card.appendChild(status);
  var footer=panel.querySelector('.ks-display-footer');panel.insertBefore(card,footer||null);

  var state=null,inflight=null,pending=null,loading=null,disposed=false;
  function token(){try{return JSON.parse(localStorage.getItem('cnc')).state.session.token||'';}catch(_){return '';}}
  function apiBase(){try{return window.cncState.get().apiBase;}catch(_){return '/api';}}
  function shown(){return !disposed&&!document.hidden&&panel.classList.contains('active');}
  function request(method,body,done){
    var credential=token();if(!credential){done(401,null);return null;}
    var x=new XMLHttpRequest();x.open(method,apiBase()+'/touch-backlight',true);x.timeout=5000;
    x.setRequestHeader('Authorization','Bearer '+credential);
    if(body)x.setRequestHeader('Content-Type','application/json');
    x.onload=function(){var data=null;try{data=JSON.parse(x.responseText);}catch(_){}done(x.status,data);};
    x.onerror=x.ontimeout=function(){done(0,null);};
    x.send(body?JSON.stringify(body):null);return x;
  }
  function usable(){return !!(state&&state.available&&state.writable);}
  function paint(){
    var on=usable();
    [down,up,slider].forEach(function(n){if(n.disabled===on)n.disabled=!on;});
    if(state&&typeof state.percent==='number'&&!inflight&&pending===null){slider.value=String(state.percent);}
    set(value,state&&typeof state.percent==='number'?Number(slider.value)+' %':'—');
    var why=!state?'':!state.available?t('Aucun rétroéclairage réglable sur cet ordinateur.'):!state.writable?t('Réglage bloqué : CNCjs n’a pas le droit de modifier la luminosité (règle udev à installer, voir README).'):'';
    if(why)set(status,why);
  }
  function message(code,data){
    return code===401||code===403?t('Session CNCjs requise : ouvrez CNCjs et connectez-vous.'):code===404?t('Ce serveur CNCjs ne gère pas la luminosité.'):(data&&data.message)||t('Luminosité indisponible.');
  }
  function load(){
    if(loading||inflight||!shown())return;
    loading=request('GET',null,function(code,data){
      loading=null;if(disposed)return;
      if(code===200&&data&&typeof data==='object'){state=data;if(typeof data.userPercent==='number')state.percent=data.userPercent;set(status,'');}
      else{state=null;set(status,message(code,data));}
      paint();
    });
  }
  function send(percent){
    if(!usable())return;
    if(inflight){pending=percent;return;}
    inflight=request('POST',{percent:percent},function(code,data){
      inflight=null;if(disposed)return;
      if(code===200&&data&&typeof data==='object'){state=data;set(status,'');}
      else{pending=null;set(status,message(code,data));if(code===409||code===0)load();}
      if(pending!==null){var next=pending;pending=null;send(next);return;}
      paint();
    });
  }
  function choose(percent){
    var v=Math.max(MIN,Math.min(100,Math.round(percent/STEP)*STEP));
    slider.value=String(v);set(value,v+' %');send(v);
  }
  // Screen saver: one request at a time, the latest wish (dim or wake) wins.
  var dimmed=false,saverBusy=false,saverNext=null;
  function saver(body){
    if(saverBusy){saverNext=body;return;}
    saverBusy=true;
    var x=request('POST',body,function(){saverBusy=false;if(saverNext){var next=saverNext;saverNext=null;saver(next);}});
    if(!x){saverBusy=false;saverNext=null;}
  }
  window.addEventListener('cnc-screen-saver-sleep',function(e){
    var asleep=!!(e&&e.detail);
    if(asleep){
      if(mode==='keep'||(state&&!usable()))return;
      dimmed=true;saver({percent:mode==='off'?0:MIN,temporary:true});
    }else if(dimmed){dimmed=false;saver({wake:true});}
  });
  sleepSelect.addEventListener('change',function(){
    if(MODES.indexOf(sleepSelect.value)<0)return;
    mode=sleepSelect.value;
    try{localStorage.setItem(KEY,JSON.stringify({sleep:mode}));}catch(_){set(status,t('Choix appliqué ; mémorisation indisponible dans ce navigateur.'));}
  });
  slider.addEventListener('input',function(){choose(Number(slider.value));});
  down.addEventListener('click',function(){choose(Number(slider.value)-10);});
  up.addEventListener('click',function(){choose(Number(slider.value)+10);});
  window.addEventListener('cnc-screen-change',load);
  window.addEventListener('cnc-settings-tab',function(e){if(e&&e.detail==='display')load();});
  document.addEventListener('visibilitychange',load);
  window.addEventListener('pagehide',function(e){if(e&&e.persisted)return;disposed=true;});
  paint();load();
  // A page reloaded while the screen saver had the panel off (an update, a crash) wakes it.
  if(token())saver({wake:true});
  window.cncBacklight={state:function(){return {state:state,inflight:!!inflight,pending:pending};}};
})();
