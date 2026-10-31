(function(){
  'use strict';
  var uiLocale=window.cncI18n||{t:function(s){return s;},html:function(s){return s;}};
  var step=1,busy=false,state=null,currentScreen='jog',lastFeedback='';
  var buttons=document.querySelectorAll('[data-sim-motion]');
  function text(el,value){if(el.textContent!==value)el.textContent=value;}
  function render(){
    if(currentScreen!=='jog'||document.hidden)return;
    buttons.forEach(function(b){var disabled=busy||!state||!state.canJog;if(b.disabled!==disabled)b.disabled=disabled;});
    if(armed&&armed.disabled)disarm();
    var mid=typeof document.querySelector==='function'?document.querySelector('#screen-jog .pad-mid'):null;
    if(mid)text(mid,step+' mm');
    document.querySelectorAll('[data-sim-coordinate]').forEach(function(el){
      var coords=state&&state[el.getAttribute('data-sim-coordinate')],axis=el.getAttribute('data-axis');
      text(el,coords?coords[axis].toFixed(3):'—');
    });
    document.querySelectorAll('.sim-motion-state').forEach(function(el){
      text(el,!state?uiLocale.t('Simulateur indisponible.'):state.activeState==='Alarm'?uiLocale.t('Alarme simulée : déplacements et origines bloqués. Voir l’onglet Machine.'):state.canJog?uiLocale.t('Prêt — un appui déplace de ')+step+uiLocale.t(' mm (instantané et fictif).'):uiLocale.t('Travail en cours ou en pause : déplacements et origines bloqués. Arrêtez le travail pour les tester.'));
    });
    document.querySelectorAll('.sim-motion-feedback').forEach(function(el){text(el,lastFeedback);});
  }
  function feedback(message){lastFeedback=window.cncI18n?window.cncI18n.message(message):message;render();}
  document.querySelectorAll('[data-sim-step]').forEach(function(b){
    b.addEventListener('click',function(){
      step=Number(b.getAttribute('data-sim-step'));
      document.querySelectorAll('[data-sim-step]').forEach(function(other){other.classList.toggle('active',other===b);other.setAttribute('aria-pressed',String(other===b));});render();
    });
  });
  // Setting a work zero is protected against an accidental tap: the first tap
  // arms the button (amber, "Confirmer") for three seconds, the second one acts.
  var armed=null,armTimer=null;
  function label(b){return typeof b.querySelector==='function'&&b.querySelector('span')||b;}
  function disarm(){
    if(armTimer!==null&&typeof clearTimeout==='function')clearTimeout(armTimer);armTimer=null;
    if(!armed)return;var b=armed;armed=null;
    if(b._label!==undefined)text(label(b),b._label);
    if(typeof b.removeAttribute==='function')b.removeAttribute('data-armed');
  }
  function arm(b){
    disarm();armed=b;b._label=label(b).textContent;text(label(b),uiLocale.t('Confirmer'));
    if(typeof b.setAttribute==='function')b.setAttribute('data-armed','true');
    if(typeof setTimeout==='function')armTimer=setTimeout(disarm,3000);
  }
  buttons.forEach(function(b){b.addEventListener('click',function(){
    if(busy||!state||!state.canJog||!window.cncJobSimulation){disarm();return;}
    if(b.getAttribute('data-sim-motion')==='zero'&&armed!==b){arm(b);return;}
    disarm();
    var body={action:b.getAttribute('data-sim-motion'),port:'SIMULATION',axis:b.getAttribute('data-axis'),step:step,direction:Number(b.getAttribute('data-direction'))};
    busy=true;render();
    window.cncJobSimulation.request('POST',body).then(function(result){feedback(result.message);return window.cncJobSimulation.request('GET');})
      .then(function(result){state=result.controllers[0];},function(e){feedback(e.message);})
      .then(function(){busy=false;render();});
  });});
  window.addEventListener('cnc-job-status',function(e){if(e.detail.simulation){state=e.detail.machine;render();}});
  window.addEventListener('cnc-screen-change',function(e){currentScreen=e.detail;render();});
  document.addEventListener('visibilitychange',render);
  render();
})();
