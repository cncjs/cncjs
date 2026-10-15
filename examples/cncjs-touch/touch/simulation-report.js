(function(root){
  'use strict';
  function report(state,now){
    if(!state||state.port!=='SIMULATION')throw new Error('Rapport réservé au simulateur.');
    function coords(value){return value?{x:value.x,y:value.y,z:value.z}:null;}
    var entries=(state.history||[]).slice(0,100).map(function(e){return {id:e.id,time:new Date(e.time).toISOString(),action:e.action,message:e.message,file:e.file,percent:e.percent};});
    return {format:'cnc-touch-simulation-report',version:1,exportedAt:new Date(now).toISOString(),
      notice:'SIMULATION uniquement. Aucun mouvement réel ni validation du parcours G-code.',
      historyLimit:100,historyOrder:'newest-first',
      finalState:{state:state.activeState,workflow:state.workflow,file:state.originalName||state.name||'',
        percent:state.total?Math.max(0,Math.min(100,state.received/state.total*100)):0,
        remainingSeconds:state.remainingSeconds,machinePosition:coords(state.machinePosition),workPosition:coords(state.workPosition)},events:entries};
  }
  function text(data){
    var s=data.finalState,lines=['CNCjs TOUCH — RAPPORT DE SIMULATION',data.notice,'Export : '+data.exportedAt,
      'État final : '+s.state+' / '+s.workflow,'Fichier : '+(s.file||'aucun'),
      'Progression fictive : '+Math.floor(s.percent)+' %',
      'Coordonnées machine fictives : '+JSON.stringify(s.machinePosition),
      'Coordonnées de travail fictives : '+JSON.stringify(s.workPosition),'',
      'JOURNAL — '+data.events.length+' événements, du plus récent au plus ancien (100 maximum).'];
    data.events.forEach(function(e){lines.push(e.time+' | '+e.message+' | '+(e.file||'sans fichier')+' | '+e.percent+' %');});
    return lines.join('\r\n');
  }
  root.cncSimulationReport={build:report,text:text};
})(window);
