(function(){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  var model=window.CNCCoordinates,host=document.querySelector('#screen-jog .ks-motion-coordinates');
  if(!model||!host)return;
  var simulation=document.body.getAttribute('data-simulation')==='true',machine=null,busy=false,received=0,draft=null,returnTo=null,background=[];
  var entry=document.createElement('button');entry.id='coordinate-open';entry.className='ks-secondary coordinate-entry';entry.textContent=simulation?uiLocale.t('Coordonnées · Aller à / Définir'):uiLocale.t('Coordonnées · préparer sans mouvement');host.appendChild(entry);
  var frameLabel=document.createElement('span');frameLabel.className='coordinate-frame';frameLabel.id='coordinate-frame-label';host.querySelector('h2').appendChild(frameLabel);
  var modal=document.createElement('div');modal.id='coordinate-editor';modal.className='coordinate-editor';modal.hidden=true;
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','coordinate-title');
  modal.innerHTML=uiLocale.html('<div class="coordinate-card"><header><h2 id="coordinate-title">Coordonnées · ')+(simulation?'SIMULATION':uiLocale.t('PRÉPARATION LOCALE'))+uiLocale.html('</h2><button id="coordinate-close">Fermer ×</button></header>')+
    uiLocale.html('<p id="coordinate-state" role="status"></p><div class="coordinate-fields"><label>Axe<select id="coordinate-axis"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label>')+
    uiLocale.html('<label>Repère<select id="coordinate-wcs">')+model.frames.map(function(w){return uiLocale.html('<option>')+w+uiLocale.html('</option>');}).join('')+uiLocale.html('</select></label>')+
    uiLocale.html('<label>Unité de saisie<select id="coordinate-unit"><option value="mm">mm</option><option value="in">pouces</option></select></label>')+
    uiLocale.html('<label>Opération<select id="coordinate-operation"><option value="goto">Aller à une coordonnée</option><option value="shift">Déplacer de ± une valeur</option><option value="set">Définir la coordonnée ici</option></select></label></div>')+
    uiLocale.html('<div class="coordinate-input-grid"><div><label for="coordinate-value">Valeur</label><input id="coordinate-value" inputmode="decimal" autocomplete="off" maxlength="18" placeholder="Saisir une valeur"><label for="coordinate-feed">Vitesse · mm/min</label><select id="coordinate-feed"><option>200</option><option selected>800</option><option>1500</option></select><p id="coordinate-current"></p></div>')+
    uiLocale.html('<div class="coordinate-keypad" aria-label="Pavé numérique">')+['7','8','9','4','5','6','1','2','3','±','0','.','Effacer','⌫'].map(function(k){return uiLocale.html('<button type="button" data-coordinate-key="')+k+'">'+uiLocale.t(k)+uiLocale.html('</button>');}).join('')+uiLocale.html('</div></div>')+
    uiLocale.html('<p id="coordinate-result" role="status">Calcul local uniquement. Aucune commande à la machine.</p><div class="coordinate-actions"><button id="coordinate-calculate">Préparer</button><button id="coordinate-confirm" disabled>')+ (simulation?uiLocale.t('Confirmer la simulation'):uiLocale.t('Exécution réelle non activée'))+uiLocale.html('</button></div>')+
    uiLocale.html('<p class="coordinate-note">')+(simulation?uiLocale.t('Positions instantanées et fictives, sans calcul de trajectoire ni de limites physiques.'):uiLocale.t('Préparation indicative : limites, homing et trajet non validés. Aucun G-code envoyé.'))+uiLocale.html('</p></div>');
  document.body.appendChild(modal);
  var $=function(id){return document.getElementById('coordinate-'+id);};
  function put(node,key,value){if(node[key]!==value)node[key]=value;}
  function snapshot(){
    if(simulation)return machine;
    if(!machine||!machine.coordinates||!machine.operator||machine.operator.reportUnits!=='mm')return null;
    return {wcs:machine.operator.wcs,machinePosition:machine.coordinates.mpos,workPosition:machine.coordinates.wpos};
  }
  function stamp(){var s=snapshot();return JSON.stringify([machine&&machine.generation,machine&&machine.motionRevision,s&&s.wcs,s&&s.machinePosition,s&&s.workPosition]);}
  function reason(){
    if(document.hidden||!machine||!machine.fresh||Date.now()-received>2500)return uiLocale.t('État absent ou périmé : attendre un rapport récent.');
    if(busy||machine.loading||machine.probeBusy||machine.workflow!=='idle'||machine.activeState!=='Idle')return uiLocale.t('Travail, alarme ou palpage : préparation bloquée.');
    if(!simulation&&machine.canPreviewMotion!==true)return machine.motionReason?uiLocale.t(machine.motionReason):uiLocale.t('État machine incompatible avec la préparation.');
    var s=snapshot();if(!s||model.frames.indexOf(s.wcs)<0)return uiLocale.t('Unité de rapport ou repère machine inconnu. Aucune valeur supposée.');
    return '';
  }
  function invalidate(message){draft=null;$('confirm').disabled=true;if(message)$('result').textContent=message;}
  function render(){
    var frame=snapshot(),label=' · '+(frame&&model.frames.indexOf(frame.wcs)>=0?frame.wcs:uiLocale.t('repère inconnu'));
    put(frameLabel,'textContent',label);
    if(modal.hidden)return;
    var why=reason(),s=snapshot();
    if(draft&&(why||draft.stamp!==stamp()||Date.now()>=draft.until))invalidate(uiLocale.t('État modifié ou préparation expirée : préparez à nouveau.'));
    put($('state'),'textContent',why||(simulation?uiLocale.t('Simulation locale · aucun contrôleur réel'):uiLocale.t('Lecture du contrôleur · aucune commande envoyée')));
    put($('calculate'),'disabled',!!why);put($('wcs'),'disabled',!simulation||!!why);
    if(s&&model.frames.indexOf(s.wcs)>=0)put($('wcs'),'value',s.wcs);else put($('wcs'),'selectedIndex',-1);
    var a=$('axis').value;
    try{put($('current'),'textContent',s?'Machine : '+model.number(s.machinePosition[a]).toFixed(3)+' mm · Travail : '+model.number(s.workPosition[a]).toFixed(3)+' mm':uiLocale.t('Coordonnées indisponibles'));}catch(_){put($('current'),'textContent',uiLocale.t('Coordonnées indisponibles'));put($('calculate'),'disabled',true);}
    put($('confirm'),'disabled',!simulation||!draft||!!why);
  }
  function close(){modal.hidden=true;invalidate();background.forEach(function(e){e.node.inert=e.inert;});background=[];if(returnTo&&returnTo.isConnected)returnTo.focus({preventScroll:true});}
  function open(){
    returnTo=document.activeElement;invalidate(uiLocale.t('Saisissez une valeur, puis préparez l’opération.'));$('value').value='';
    background=Array.prototype.filter.call(document.body.children,function(n){return n!==modal&&!/^(SCRIPT|LINK|STYLE)$/.test(n.tagName);}).map(function(n){var e={node:n,inert:n.inert};n.inert=true;return e;});
    modal.hidden=false;render();$('close').focus();
  }
  entry.addEventListener('click',open);$('close').addEventListener('click',close);
  ['axis','unit','operation','feed'].forEach(function(id){$(id).addEventListener('change',function(){invalidate(uiLocale.t('Paramètres modifiés : préparez à nouveau.'));if(id==='unit')$('value').value='';render();});});
  $('value').addEventListener('input',function(){invalidate();});
  modal.querySelectorAll('[data-coordinate-key]').forEach(function(button){button.addEventListener('click',function(){
    var k=button.getAttribute('data-coordinate-key'),v=$('value').value;
    if(k==='Effacer')v='';else if(k==='⌫')v=v.slice(0,-1);else if(k==='±')v=v.charAt(0)==='-'?v.slice(1):'-'+v;else if(v.length<18&&!(k==='.'&&/[.,]/.test(v)))v+=k;
    $('value').value=v;invalidate();
  });});
  function act(body){
    busy=true;invalidate();render();
    return window.cncJobSimulation.request('POST',body).then(function(result){$('result').textContent=result.message;return window.cncJobSimulation.request('GET');})
      .then(function(result){machine=result.controllers[0];received=Date.now();if(window.cncJobControls)window.cncJobControls.refresh();},function(error){$('result').textContent=error.message;})
      .then(function(){busy=false;render();});
  }
  $('wcs').addEventListener('change',function(){if(!simulation||reason()){render();return;}act({port:'SIMULATION',action:'select-wcs',wcs:this.value,motionRevision:machine.motionRevision});});
  $('calculate').addEventListener('click',function(){
    invalidate();if(reason()){render();return;}
    try{
      var body={port:'SIMULATION',action:'coordinate',operation:$('operation').value,axis:$('axis').value,unit:$('unit').value,value:$('value').value,feed:Number($('feed').value),motionRevision:machine.motionRevision};
      var p=model.plan(snapshot(),body);draft={body:body,stamp:stamp(),until:Date.now()+15000};
      $('result').textContent=p.wcs+' · '+p.axis.toUpperCase()+uiLocale.t(' travail → ')+p.targetWorkMm+uiLocale.t(' mm · machine ')+p.targetMachineMm+' mm. '+(p.operation==='set'?uiLocale.t('Origine modifiée, aucun déplacement.'):uiLocale.t('Déplacement ')+(simulation?'fictif.':uiLocale.t('non exécuté.')));
      render();
    }catch(error){invalidate(error.message);}
  });
  $('confirm').addEventListener('click',function(){
    if(!simulation||!draft||reason()||stamp()!==draft.stamp||Date.now()>=draft.until){invalidate(uiLocale.t('Préparation invalide : recommencez.'));render();return;}
    var body=draft.body;act(body);
  });
  window.addEventListener('cnc-job-status',function(e){if(!!e.detail.simulation!==simulation)return;machine=e.detail.machine;received=Date.now();render();});
  window.addEventListener('cnc-screen-change',function(){if(!modal.hidden)close();});
  document.addEventListener('visibilitychange',function(){invalidate();if(document.hidden&&!modal.hidden)close();});
  document.addEventListener('keydown',function(e){
    if(modal.hidden)return;if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){var controls=Array.prototype.filter.call(modal.querySelectorAll('button,input,select'),function(n){return !n.disabled;});var first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
})();
