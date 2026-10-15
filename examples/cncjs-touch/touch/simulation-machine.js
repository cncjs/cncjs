(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);},state=null,busy=false,currentScreen='machine',feedback='';
  function value(id,key,next){var el=$(id);if(el[key]!==next)el[key]=next;}
  function render(){
    if(currentScreen!=='machine'||document.hidden)return;
    value('sim-machine-state','textContent',state?'État fictif : '+state.activeState:'Simulateur indisponible');
    value('sim-machine-state','className','badge '+(state&&state.activeState==='Alarm'?'err':'ok'));
    value('sim-machine-file','textContent',state&&state.name?'Fichier : '+(state.originalName||state.name):'Aucun fichier chargé dans le simulateur.');
    value('sim-machine-workflow','textContent',state?'Travail : '+({idle:'au repos',running:'en cours',paused:'suspendu'}[state.workflow]||state.workflow):'');
    value('sim-trigger-alarm','disabled',busy||!state||state.activeState==='Alarm');
    value('sim-clear-alarm','disabled',busy||!state||state.activeState!=='Alarm');
    value('sim-machine-feedback','textContent',feedback);
  }
  function action(name){
    if(busy||!window.cncJobSimulation)return;
    busy=true;render();
    window.cncJobSimulation.request('POST',{action:name,port:'SIMULATION'}).then(function(result){
      feedback=result.message;
      return window.cncJobSimulation.request('GET');
    }).then(function(result){state=result.controllers[0];},function(e){feedback=e.message;})
      .then(function(){busy=false;render();});
  }
  $('sim-trigger-alarm').addEventListener('click',function(){action('simulate-alarm');});
  $('sim-clear-alarm').addEventListener('click',function(){action('clear-simulated-alarm');});
  window.addEventListener('cnc-job-status',function(e){if(e.detail.simulation){state=e.detail.machine;render();}});
  window.addEventListener('cnc-screen-change',function(e){currentScreen=e.detail;render();});
  document.addEventListener('visibilitychange',render);
  render();
})();
