(function(){
  'use strict';
  var step=1,busy=false,state=null,currentScreen='jog',lastFeedback='';
  var buttons=document.querySelectorAll('[data-sim-motion]');
  function text(el,value){if(el.textContent!==value)el.textContent=value;}
  function render(){
    if(currentScreen!=='jog'||document.hidden)return;
    buttons.forEach(function(b){var disabled=busy||!state||!state.canJog;if(b.disabled!==disabled)b.disabled=disabled;});
    document.querySelectorAll('[data-sim-coordinate]').forEach(function(el){
      var coords=state&&state[el.getAttribute('data-sim-coordinate')],axis=el.getAttribute('data-axis');
      text(el,coords?coords[axis].toFixed(3):'—');
    });
    document.querySelectorAll('.sim-motion-state').forEach(function(el){
      text(el,!state?'Simulateur indisponible.':state.activeState==='Alarm'?'Alarme simulée : déplacements et origines bloqués. Voir l’onglet Machine.':state.canJog?'Prêt — un appui déplace de '+step+' mm (instantané et fictif).':'Travail en cours ou en pause : déplacements et origines bloqués. Arrêtez le travail pour les tester.');
    });
    document.querySelectorAll('.sim-motion-feedback').forEach(function(el){text(el,lastFeedback);});
  }
  function feedback(message){lastFeedback=message;render();}
  document.querySelectorAll('[data-sim-step]').forEach(function(b){
    b.addEventListener('click',function(){
      step=Number(b.getAttribute('data-sim-step'));
      document.querySelectorAll('[data-sim-step]').forEach(function(other){other.classList.toggle('active',other===b);other.setAttribute('aria-pressed',String(other===b));});render();
    });
  });
  buttons.forEach(function(b){b.addEventListener('click',function(){
    if(busy||!state||!state.canJog||!window.cncJobSimulation)return;
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
