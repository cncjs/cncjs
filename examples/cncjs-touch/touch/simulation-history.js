(function(){
  'use strict';
  var uiLocale=(typeof window!=='undefined'&&window.cncI18n)||{t:function(s){return s;},html:function(s){return s;}};
  var $=function(id){return document.getElementById(id);},events=[],page=0,signature='',size=5,dirty=true,rows=Object.create(null),mounted=false;
  function set(el,key,value){if(el[key]!==value)el[key]=value;}
  function render(){
    if(!mounted||document.hidden||!$('screen-history').classList.contains('active')||!dirty)return;
    dirty=false;
    page=Math.min(page,Math.max(0,Math.ceil(events.length/size)-1));
    var list=$('sim-history-list'),desired=[],keep=Object.create(null);
    events.slice(page*size,(page+1)*size).forEach(function(e){
      var row=rows[e.id];
      if(!row){row=document.createElement('li');row._title=document.createElement('strong');row._detail=document.createElement('p');row.appendChild(row._title);row.appendChild(row._detail);rows[e.id]=row;}
      set(row._title,'textContent',new Date(e.time).toLocaleTimeString(window.cncI18n?window.cncI18n.locale:'fr-FR')+' — '+e.message);
      set(row._detail,'textContent',(e.file?uiLocale.t('Fichier : ')+e.file+' · ':'')+e.percent+' %');
      desired.push(row);keep[e.id]=true;
    });
    desired.forEach(function(row,i){if(list.children[i]!==row)list.insertBefore(row,list.children[i]||null);});
    while(list.children.length>desired.length)list.removeChild(list.lastChild);
    Object.keys(rows).forEach(function(id){if(!keep[id])delete rows[id];});
    set($('sim-history-page'),'textContent',events.length?uiLocale.t('Page ')+(page+1)+' / '+Math.ceil(events.length/size)+' · '+events.length+uiLocale.t(' événements'):uiLocale.t('Aucun événement.'));
    set($('sim-history-prev'),'disabled',page===0);set($('sim-history-next'),'disabled',(page+1)*size>=events.length);
  }
  $('sim-history-prev').addEventListener('click',function(){page=Math.max(0,page-1);dirty=true;render();});
  $('sim-history-next').addEventListener('click',function(){if((page+1)*size<events.length)page++;dirty=true;render();});
  window.addEventListener('cnc-history-page-size',function(e){
    var next=Number(e.detail);if(next!==3&&next!==5)return;
    if(next!==size){page=Math.floor(page*size/next);size=next;dirty=true;render();}
  });
  var exporting=false,exportVersion=0;
  function download(format){
    if(exporting||!window.cncJobSimulation||!window.cncSimulationReport)return;
    var version=++exportVersion;
    exporting=true;$('sim-export-text').disabled=true;$('sim-export-json').disabled=true;
    window.cncJobSimulation.request('GET').then(function(result){
      if(version!==exportVersion)return;
      var data=window.cncSimulationReport.build(result.controllers[0],Date.now());
      var content=format==='json'?JSON.stringify(data,null,2):window.cncSimulationReport.text(data);
      var blob=new Blob([content],{type:format==='json'?'application/json;charset=utf-8':'text/plain;charset=utf-8'});
      var filename='cnc-simulation-'+data.exportedAt.replace(/[:.]/g,'-')+'.'+format;
      window.CNCDownload.save(blob,filename);
      $('sim-export-status').textContent=uiLocale.t('Téléchargement demandé : ')+filename+uiLocale.t('. Le journal reste disponible dans cette page.');
    }).catch(function(e){if(version===exportVersion)$('sim-export-status').textContent=uiLocale.t('Export impossible : ')+e.message;})
      .then(function(){if(version===exportVersion){exporting=false;$('sim-export-text').disabled=false;$('sim-export-json').disabled=false;}});
  }
  window.addEventListener('pagehide',function(){exportVersion++;exporting=false;$('sim-export-text').disabled=false;$('sim-export-json').disabled=false;});
  $('sim-export-text').addEventListener('click',function(){download('txt');});
  $('sim-export-json').addEventListener('click',function(){download('json');});
  window.addEventListener('cnc-job-status',function(e){
    if(!e.detail.simulation||!e.detail.machine)return;
    var next=(e.detail.machine.history||[]).slice(0,200),key=JSON.stringify(next);
    if(key===signature)return;signature=key;events=next;page=0;dirty=true;render();
  });
  function mount(){if(document.hidden||!$('screen-history').classList.contains('active'))return;mounted=true;render();}
  function unmount(){mounted=false;} // The journal subscription is page-wide; this view creates no timers or requests.
  window.addEventListener('cnc-screen-change',function(e){if(e.detail==='history')mount();else unmount();});
  document.addEventListener('visibilitychange',function(){if(document.hidden)unmount();else mount();});
  window.cncSimulationHistoryView={mount:mount,unmount:unmount};
  mount();
})();
