const fs=require('fs'),vm=require('vm'),assert=require('assert').strict;
function runtime(language){
 const window={},document={documentElement:{},title:'CNC',querySelectorAll:()=>[]};
 const context={window,document,localStorage:{getItem:()=>language},Date,Promise};
 for(const key of ['fetch','XMLHttpRequest','WebSocket'])Object.defineProperty(context,key,{get(){throw Error('No transport permitted');}});
 ['i18n-messages.js','i18n.js','coordinate-plan.js','job-simulation.js','simulation-report.js','session-journal.js'].forEach(name=>vm.runInNewContext(fs.readFileSync(__dirname+'/touch/'+name,'utf8'),context));
 return window;
}
(async()=>{
 for(const language of ['fr','en','es']){
  const w=runtime(language),api=w.cncJobSimulation,filename='Fichiers — Pause fictive. <test>.gcode';
  const send=body=>api.request('POST',{port:'SIMULATION',...body});
  await assert.rejects(()=>api.request('POST',{port:'/dev/real',action:'start'}));
  await send({action:'load',file:filename});
  let state=(await api.request('GET')).controllers[0];
  const ticket=await send({action:'prepare',revision:state.revision,operation:'start'});
  await send({action:'start',nonce:ticket.nonce});await send({action:'pause'});
  state=(await api.request('GET')).controllers[0];
  assert.equal(state.port,'SIMULATION');assert.equal(state.workflow,'paused');assert.equal(state.activeState,'Hold');
  assert.equal(state.history[0].message,w.cncI18n.t('Pause fictive.'));
  assert.equal(state.history[0].action,'pause');assert.equal(state.originalName,filename);
  await send({action:'simulate-alarm'});
  state=(await api.request('GET')).controllers[0];
  assert.equal(state.activeState,'Alarm');assert(!state.canStart&&!state.canResume);
  assert(state.history[0].message.includes(w.cncI18n.t('Commandes bloquées.')));
  const report=w.cncSimulationReport.build({...state,nonce:'SECRET',token:'SECRET'},0);
  assert.equal(report.language,language);assert.equal(report.format,'cnc-touch-simulation-report');
  assert.equal(report.finalState.file,filename);assert.equal(report.finalState.state,'Alarm');
  assert(!JSON.stringify(report).includes('SECRET'));assert(!JSON.stringify(report).includes(ticket.nonce));
  const text=w.cncSimulationReport.text(report);
  assert(text.includes(w.cncI18n.t('CNC TOUCH — RAPPORT DE SIMULATION')));assert(text.includes(filename));
  assert(text.includes(w.cncI18n.t('Pause fictive.')));
  await send({action:'stop'});await send({action:'clear-simulated-alarm'});
  await send({action:'jog',axis:'x',step:1,direction:1});
  state=(await api.request('GET')).controllers[0];assert.equal(state.workPosition.x,1);
  assert(state.history[0].message.includes(w.cncI18n.t('Déplacement')));
  // The real journal receives observations only; unknown protocol strings stay intact.
  const journal=w.cncSessionJournal.create(()=>0);
  journal.connection(true);journal.observe({port:'/dev/test',originalName:filename,name:filename,fresh:true,activeState:'Hold:0',workflow:'paused',nonce:'SECRET'});
  const real=journal.report(),realText=w.cncSessionJournal.text(real);
  assert.equal(real.mode,'interface-reelle');assert.equal(real.language,language);
  assert(realText.includes(w.cncI18n.t('CNC TOUCH — Journal de l’interface réelle')));
  assert(realText.includes('Hold:0'));assert(realText.includes(filename));assert(!JSON.stringify(real).includes('SECRET'));
  assert(real.events.some(e=>e.kind==='workflow'&&e.message.includes(w.cncI18n.t('en pause'))));
  const count=real.events.length;journal.connection(true);assert.equal(journal.report().events.length,count);
  const observed={port:'/dev/test',fresh:true,name:filename,activeState:'Hold:0',workflow:'paused'};
  journal.observe({...observed,generation:'one'});journal.observe({...observed,generation:'two'});
  const message=w.cncI18n.t('Nouvelle instance du contrôleur observée sur le même port.');
  assert(journal.report().events.some(e=>e.kind==='availability'&&e.message===message));
  assert(w.cncSessionJournal.text(journal.report()).includes(message));
  if(language!=='fr')assert.notEqual(message,'Nouvelle instance du contrôleur observée sur le même port.');
  for(let n=0;n<110;n++)journal.connection(n%2===0);
  assert.equal(journal.report().events.length,100);
 }
 console.log('PASS: FR/EN/ES simulation lifecycle, localized journals and TXT/JSON exports, unchanged names/protocol, whitelist, cap and no transport.');
})().catch(error=>{console.error(error);process.exitCode=1;});
