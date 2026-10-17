'use strict';
// Commissioning assistant: pure step model (E-stop, limits, probe, homing, spindle,
// air cut), then the screen on the DOM fixture: auto-open on the first real
// controller only, per-port persistence and resume, skip under confirmation,
// commands only through cncJobControls, spindle stopped when leaving its step.
const fs=require('fs'),vm=require('vm'),assert=require('assert').strict;
const {createDOM}=require('./dom-fixture.cjs');
const source=fs.readFileSync(__dirname+'/touch/commissioning.js','utf8');

function fixture(saved){
 const dom=createDOM(['menu']),handlers={},store=new Map(saved?[['cncjs-touch-commissioning-v1',saved]]:[]),screens=[],calls=[];
 dom.document.body.getAttribute=()=>null;
 const controls={cancel:()=>calls.push(['cancel']),prepareCommand:op=>calls.push(['prepare',op]),spindleStop:()=>{calls.push(['spindleStop']);return Promise.resolve({message:'M5'});},
  readSettings:()=>{calls.push(['readSettings']);return Promise.resolve({});},settings:()=>Promise.resolve({firmware:'Grbl 1.1h',settings:{$31:6000,$1:25}})};
 const window={addEventListener:(n,f)=>handlers[n]=f,cncJobControls:controls,
  cncShell:{go:name=>{screens.push(name);if(handlers['cnc-screen-change'])handlers['cnc-screen-change']({detail:name});}}};
 const context={window,document:dom.document,localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},JSON,Object,Math,Date,String,Number,Promise};
 vm.runInNewContext(source,context);
 const screen=dom.node('panel').children.find(c=>c.id==='screen-commissioning');
 function all(node){return node.children.flatMap(c=>[c,...all(c)]);}
 const find=(pred)=>all(screen).find(pred);
 const byText=(text)=>find(n=>n.tagName==='BUTTON'&&n.textContent.indexOf(text)===0);
 return {dom,window,handlers,store,screens,calls,screen,find,byText,
  data:()=>JSON.parse(store.get('cncjs-touch-commissioning-v1')||'{}'),
  send(machine){handlers['cnc-job-status']({detail:{machine,simulation:false}});},
  title:()=>find(n=>n.tagName==='H2').textContent,
  next:()=>find(n=>n.className==='ks-wiz-next'&&/Suivant|Terminer/.test(n.textContent)),
  tick(index){const boxes=all(find(n=>n.className==='ks-wiz-content')).filter(n=>n.tagName==='INPUT');const i=boxes[index];i.checked=true;i.handlers.change();}};
}
const M=(extra)=>Object.assign({port:'/dev/ttyUSB0',fresh:true,workflow:'idle',activeState:'Idle',probeInput:{fresh:true,pins:''},canUnlock:false,canHome:true,canSpindleTest:true,canSpindleStop:true,spindleTestSpeed:6000,spindleSpeed:0,settingsCount:34,firmware:'Grbl 1.1h'},extra);

// ---- Model ----
{
 const ctx={window:{}};vm.runInNewContext(source,ctx);const C=ctx.window.CNCCommissioning;
 assert.equal(C.STEPS.length,9);
 // E-stop: an alarm already present when the step opens is not the E-stop.
 let st=C.observe('estop',{},M({activeState:'Alarm'}));assert(!st.alarm&&!st.armed);
 C.observe('estop',st,M());assert(st.armed&&!st.back);
 C.observe('estop',st,M({activeState:'Alarm'}));assert(st.alarm);assert.equal(C.result('estop',st),'');
 C.observe('estop',st,M());assert.equal(C.result('estop',st),'ok');
 // A gap in the reports (the event stream renews every minute) is not an E-stop.
 st=C.observe('estop',{},M({startups:2}));C.observe('estop',st,null);C.observe('estop',st,M({fresh:false}));C.observe('estop',st,M({startups:2}));assert.equal(C.result('estop',st),'');
 // A board restart counted by the server (E-stop wired to reset) counts.
 C.observe('estop',st,null);C.observe('estop',st,M({startups:3}));assert.equal(C.result('estop',st),'ok');
 // Without the counter (older server), only an alarm proves it.
 st=C.observe('estop',{},M());C.observe('estop',st,null);C.observe('estop',st,M());assert.equal(C.result('estop',st),'');
 st={manual:true};assert.equal(C.result('estop',st),'');st.checks={motors:true};assert.equal(C.result('estop',st),'manual');
 // Limits: each axis must be seen free, then triggered.
 st=C.observe('limits',{},M({probeInput:{fresh:true,pins:'X'}}));assert(!st.seen.X,'active from the start: not counted');
 ['', 'X','','Y','YZ',''].forEach(p=>C.observe('limits',st,M({probeInput:{fresh:true,pins:p}})));
 assert.deepEqual([st.seen.X,st.seen.Y,st.seen.Z],[true,true,true]);assert.equal(C.result('limits',st),'ok');
 st=C.observe('limits',{},M({probeInput:{fresh:false,pins:'X'}}));assert.equal(st.active.X,null);
 // Probe: contact, then released.
 st={};['','P'].forEach(p=>C.observe('probe',st,M({probeInput:{fresh:true,pins:p}})));assert.equal(C.result('probe',st),'');
 C.observe('probe',st,M({probeInput:{fresh:true,pins:''}}));assert.equal(C.result('probe',st),'ok');
 // Homing: Home then Idle; an alarm in between is a failure.
 st={};C.observe('homing',st,M({activeState:'Home'}));C.observe('homing',st,M({activeState:'Alarm'}));assert(st.failed&&!st.homed);
 C.observe('homing',st,M({activeState:'Home'}));C.observe('homing',st,M());assert.equal(C.result('homing',st),'ok');
 // A controller silent during the cycle: $H sent from Idle, no report, then ALARM:9.
 st={sent:true,from:'Idle'};C.observe('homing',st,M());assert(!st.left);C.observe('homing',st,null);C.observe('homing',st,M({activeState:'Alarm'}));assert(st.failed&&!st.homed);
 // Sent from an alarm: back to Idle after a silent cycle is a success; staying in alarm is not.
 st={sent:true,from:'Alarm'};C.observe('homing',st,M({activeState:'Alarm'}));assert(!st.failed&&!st.homed);
 C.observe('homing',st,null);C.observe('homing',st,M());assert.equal(C.result('homing',st),'ok');
 // Sent from Idle and back to Idle without any Home report: not proven.
 st={sent:true,from:'Idle'};C.observe('homing',st,null);C.observe('homing',st,M());assert.equal(C.result('homing',st),'');
 // Spindle: seen turning, then stopped, plus the three checks.
 st={};C.observe('spindle',st,M({spindleSpeed:6000}));C.observe('spindle',st,M({spindleSpeed:0}));assert.equal(C.result('spindle',st),'');
 st.checks={direction:true,noise:true,vfd:true};assert.equal(C.result('spindle',st),'ok');
 // Air cut: the test program finished (stored name carries the library suffix).
 st={};C.observe('aircut',st,M({finished:true,originalName:'essai-en-l-air.nc'}));assert.equal(C.result('aircut',st),'ok');
 st={};C.observe('aircut',st,M({finished:true,originalName:'other.nc'}));assert.equal(C.result('aircut',st),'');
 const program=C.program(6000);
 assert.match(program,/M3 S6000/);assert.match(program,/M5\nG0 X0 Y0\nM2/);
 assert(!/Z-/.test(program),'the air cut never goes below Z0');assert(!/^\s*%/m.test(program),'no CNCjs % directives');
 const text=C.settingsText({firmware:'Grbl 1.1h',settings:{$110:5000,$2:0,$30:24000,junk:1}},'/dev/ttyUSB0','2026-10-17');
 assert.deepEqual(text.trim().split('\n').slice(2),['$2=0','$30=24000','$110=5000']);
}

// ---- Screen ----
{
 const f=fixture();
 f.send(M({port:'/home/pi/ttyGRBL-sim'}));assert.deepEqual(f.screens,[],'simulator port: no auto-open');
 f.send(M({fresh:false}));assert.deepEqual(f.screens,[]);
 f.send(M());assert.deepEqual(f.screens,['commissioning'],'first real controller: opened once');
 assert.equal(f.data().machines['/dev/ttyUSB0'].status,'progress');
 assert.equal(f.title(),'Avant de commencer');assert(f.next().disabled);
 f.tick(0);f.tick(1);assert(f.next().disabled);f.tick(2);assert(!f.next().disabled);
 f.next().click();assert.equal(f.title(),'Sauvegarde des réglages');assert.equal(f.data().machines['/dev/ttyUSB0'].step,1);
 assert.equal(f.data().machines['/dev/ttyUSB0'].results.prepare,'ok');
 f.byText('Relire').click();assert.deepEqual(f.calls,[['readSettings']]);
 f.byText('Passer cette étape').click();assert.equal(f.title(),'Arrêt d’urgence');
 assert.equal(f.data().machines['/dev/ttyUSB0'].results.backup,'skipped');
 // E-stop: alarm, unlock through the confirmation, back to Idle.
 f.send(M({activeState:'Alarm',canUnlock:true,canHome:true}));
 const unlock=f.byText('Déverrouiller');assert(!unlock.disabled);unlock.click();assert.deepEqual(f.calls.at(-1),['prepare','unlock']);
 assert(f.next().disabled);f.send(M());assert(!f.next().disabled);f.next().click();
 assert.equal(f.title(),'Fins de course');
 ['X','','Y',''].forEach(p=>f.send(M({probeInput:{fresh:true,pins:p}})));
 assert(f.next().disabled,'Z not seen yet');
 ['Z',''].forEach(p=>f.send(M({probeInput:{fresh:true,pins:p}})));assert(!f.next().disabled);f.next().click();
 f.byText('Passer cette étape').click();assert.equal(f.title(),'Prise d’origine');
 const home=f.byText('Lancer la prise');assert(home.disabled,'hand on the E-stop first');f.tick(0);assert(!home.disabled);
 home.click();assert.deepEqual(f.calls.at(-1),['prepare','home']);
 f.handlers['cnc-command-sent']({detail:'home'});f.send(M({fresh:false}));f.send(M({activeState:'Alarm',canUnlock:true}));
 assert(f.find(n=>n.className==='ks-wiz-strong'&&/Échec/.test(n.textContent)),'silent cycle then alarm: failure shown');assert(f.next().disabled);
 f.send(M({activeState:'Home'}));f.send(M());f.next().click();
 assert.equal(f.title(),'Broche et variateur');
 const start=f.byText('Démarrer à 6000');assert(start.disabled);f.tick(0);f.tick(1);assert(!start.disabled);
 start.click();assert.deepEqual(f.calls.at(-1),['prepare','spindle']);
 f.send(M({spindleSpeed:6000}));assert(f.byText('Démarrer à').disabled,'already turning');
 // Leaving the step while the spindle turns sends M5 and closes any confirmation.
 f.byText('Passer cette étape').click();assert.deepEqual(f.calls.slice(-2),[['cancel'],['spindleStop']]);
 // A start asked but not yet seen turning (M3 on its way) is stopped too.
 f.byText('← Précédent').click();assert.equal(f.title(),'Broche et variateur');f.send(M());f.tick(0);f.tick(1);
 f.byText('Démarrer à').click();f.byText('Passer cette étape').click();assert.deepEqual(f.calls.slice(-2),[['cancel'],['spindleStop']]);
 assert.equal(f.title(),'Fichier « en l’air »');
 // Leaving the screen and resuming later: back on the same step.
 f.window.cncShell.go('menu');
 const g=fixture(f.store.get('cncjs-touch-commissioning-v1'));
 g.send(M());assert.deepEqual(g.screens,[],'known port: no auto-open');
 g.window.cncCommissioning.open();assert.equal(g.title(),'Fichier « en l’air »');
 g.byText('Passer cette étape').click();assert.equal(g.title(),'Bilan');
 g.next().click();
 const saved=g.data().machines['/dev/ttyUSB0'];assert.equal(saved.status,'done');assert(saved.date);assert.equal(saved.firmware,'Grbl 1.1h');
 assert.deepEqual(saved.results,{prepare:'ok',backup:'skipped',estop:'ok',limits:'ok',probe:'skipped',homing:'ok',spindle:'skipped',aircut:'skipped'});
 assert.equal(g.screens.at(-1),'menu');
}
{
 // Skip the whole assistant: only after ticking the responsibility box.
 const f=fixture();f.send(M());
 f.byText('Passer l’assistant…').click();
 const confirm=f.find(n=>n.tagName==='BUTTON'&&n.textContent==='Passer l’assistant');assert(confirm.disabled);
 confirm.click();assert.equal(f.data().machines['/dev/ttyUSB0'].status,'progress');
 const boxes=f.find(n=>n.className==='card wide ks-wiz-warning');const check=boxes.children.find(c=>c.tagName==='LABEL').children[0];
 check.checked=true;check.handlers.change();assert(!confirm.disabled);confirm.click();
 assert.equal(f.data().machines['/dev/ttyUSB0'].status,'skipped');assert.equal(f.screens.at(-1),'menu');
}
for(const name of ['index.html','simulation.html']){
 const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');
 if(name==='simulation.html'){assert(!html.includes('commissioning.js'),'real machines only');continue;}
 assert.equal((html.match(/src="commissioning\.js\?v=/g)||[]).length,1);
 ['touch-shell.js','job-controls.js','system-monitor.js','download-file.js','shared-library.js'].forEach(dep=>assert(html.indexOf(dep)<html.indexOf('commissioning.js'),dep+' loads first'));
 assert(html.indexOf('commissioning.js')<html.indexOf('viewport-fit.js'),'the screen exists before viewport-fit scans it');
}
console.log('PASS commissioning: step model, auto-open on the first real controller, persistence and resume, guarded commands, spindle stop on leave, skip under confirmation.');
