'use strict';
// Resume from a line and program pauses in Suivi: texts, suggested line after a
// stop, the panel flow (check, then load), the M5 button during a tool change,
// the dialog note, and every phrase translated. Synthetic DOM, no network.
const assert=require('assert').strict,fs=require('fs'),vm=require('vm');
const R=require('./touch/job-resume');
// Texts.
const m6={kind:'M6',message:'T2 M6',tool:2,restartSpindle:{mode:'M3',speed:12000}};
assert.match(R.pauseText(m6),/^Changement d’outil T2 : .*M5.*zéro Z.*La broche sera relancée \(M3 S12000, 3 s\)/);
assert.match(R.pauseText({kind:'M0',message:'M0 (brides)',tool:null}),/^Pause demandée par le programme \(M0\) : M0 \(brides\)\./);
assert.match(R.pauseText({kind:'error',message:'error:24'}),/reprenez à une ligne/);
assert.equal(R.pauseText(null),'');assert.equal(R.pauseText({kind:'other'}),'');
assert.match(R.dialogNote('resume',{programPause:m6}),/^Outil T2 en place et zéro Z vérifié \?/);
assert.match(R.dialogNote('start',{resume:{from:120,total:900,line:'G1 X5',tool:3}}),/^Reprise à la ligne 120 \/ 900 : G1 X5 — outil attendu T3\./);
assert.equal(R.dialogNote('start',{resume:null}),'');assert.equal(R.dialogNote('resume',{programPause:{kind:'M0'}}),'');
assert.equal(R.suggestedLine({stoppedAtLine:200,stoppedFile:'a.nc'},'a.nc'),185);
assert.equal(R.suggestedLine({stoppedAtLine:10,stoppedFile:'a.nc'},'a.nc'),2);
assert.equal(R.suggestedLine({stoppedAtLine:200,stoppedFile:'b.nc'},'a.nc'),null);
const plan={from:12,total:16,line:'G2 X50 Y40 I10 J0',safeZ:5,position:{X:40,Y:30,Z:-1.5},spindle:{mode:'M3',speed:12000},coolant:'M8',tool:2};
assert.equal(R.planText(plan),'Ligne 12 / 16 : G2 X50 Y40 I10 J0. Départ : Z 5, puis X 40 Y 30, plongée à Z -1.5. Broche M3 S12000 relancée 3 s avant la plongée. Arrosage M8. Outil attendu : T2 (vérifiez qu’il est en place et que le zéro Z lui correspond).');
// Every phrase used by the module is in the FR/EN/ES catalog.
const source=fs.readFileSync(__dirname+'/touch/job-resume.js','utf8');
const phrases=[...source.matchAll(/\bt\('((?:[^'\\]|\\.)*)'\)/g)].map(m=>m[1]).concat([...source.matchAll(/el\('[a-z]+','[^']*','[^']*','((?:[^'\\]|\\.)*)'\)/g)].map(m=>m[1]));
const catalog={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/touch/i18n-messages.js','utf8'),catalog);
const keys=new Set(catalog.window.CNCTouchMessages.map(r=>r[0].trim().replace(/\s+/g,' ')));
for(const p of new Set(phrases))assert(keys.has(p.trim().replace(/\s+/g,' ')),'missing translation: '+p);
// DOM flow on the real page.
const {document,node,element}=require('./dom-fixture.cjs').createDOM(['home']);
const ready=node('home-job-ready'),parent=element('div','home-actions');parent.appendChild(ready);
document.body.getAttribute=()=>null;
const listeners={},calls=[];let planResult=Promise.resolve(plan);
const window={cncLibrarySelection:{file:'a.nc',name:'a.nc'},addEventListener:(n,f)=>(listeners[n]=listeners[n]||[]).push(f),
  cncJobControls:{resumePlan:(f,l)=>{calls.push(['plan',f,l]);return planResult;},loadFrom:(f,l)=>{calls.push(['load',f,l]);return Promise.resolve({});},spindleStop:()=>{calls.push(['m5']);return Promise.resolve({});}}};
vm.runInNewContext(source,{window,document});
const ids=parent.children.map(c=>c.id);assert.deepEqual(ids,['home-job-ready','home-program-pause','home-resume-line','home-resume-panel']);
const byId=id=>parent.children.find(c=>c.id===id)||parent.children.flatMap(c=>c.children).find(c=>c.id===id);
const status=machine=>listeners['cnc-job-status'].forEach(f=>f({detail:{machine,simulation:false}}));
const idle={fresh:true,workflow:'idle',canLoad:true,stoppedAtLine:200,stoppedFile:'a.nc',programPause:null};
status(idle);assert.equal(byId('home-resume-line').hidden,false);assert.equal(byId('home-program-pause').hidden,true);
byId('home-resume-line').click();assert.equal(byId('home-resume-panel').hidden,false);assert.equal(byId('home-resume-input').value,'185');
assert.match(byId('home-resume-hint').textContent,/ligne 200.*proposée 185/);
assert.equal(byId('home-resume-load').disabled,true,'nothing to load before a check');
const flush=()=>new Promise(setImmediate);
byId('home-resume-check').click();
(async()=>{
  await flush();
  assert.deepEqual(calls.at(-1),['plan','a.nc',185]);assert.match(byId('home-resume-plan').textContent,/^Ligne 12 \/ 16/);assert.equal(byId('home-resume-load').disabled,false);
  // Editing the line asks for a new check.
  byId('home-resume-input').value='190';byId('home-resume-input').handlers.input();assert.equal(byId('home-resume-load').disabled,true);
  planResult=Promise.reject(new Error('Position avant la ligne 190 inconnue'));byId('home-resume-check').click();await flush();
  assert.equal(byId('home-resume-plan').textContent,'Position avant la ligne 190 inconnue');assert.equal(byId('home-resume-load').disabled,true);
  planResult=Promise.resolve(plan);byId('home-resume-check').click();await flush();
  byId('home-resume-load').click();await flush();assert.deepEqual(calls.at(-1),['load','a.nc',190]);assert.equal(byId('home-resume-panel').hidden,true);
  // A running job hides the resume, a tool change pause explains itself and offers M5 while the spindle turns.
  status({...idle,workflow:'paused',canLoad:false,programPause:m6,canSpindleStop:true,spindleSpeed:12000});
  assert.equal(byId('home-resume-line').hidden,true);assert.equal(byId('home-program-pause').hidden,false);
  assert.match(byId('home-program-pause-text').textContent,/^Changement d’outil T2/);assert.equal(byId('home-pause-m5').hidden,false);
  byId('home-pause-m5').click();assert.deepEqual(calls.at(-1),['m5']);
  status({...idle,workflow:'paused',canLoad:false,programPause:m6,canSpindleStop:true,spindleSpeed:0});assert.equal(byId('home-pause-m5').hidden,true);
  // Open panel closed when the machine is no longer idle; the simulation events are ignored.
  status(idle);byId('home-resume-line').click();status({...idle,workflow:'running',canLoad:false});assert.equal(byId('home-resume-panel').hidden,true);
  listeners['cnc-job-status'].forEach(f=>f({detail:{machine:{...idle,programPause:m6},simulation:true}}));assert.equal(byId('home-program-pause').hidden,true);
  // Both pages load the module after the dashboard that creates #home-job-ready.
  for(const name of ['index.html','simulation.html']){const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8'),at=f=>html.indexOf(f+'?v=');assert(at('job-resume.js')>at('job-dashboard.js')&&at('job-dashboard.js')>0,name);}
  console.log('PASS job resume: pause texts, suggested line after a stop, check then load, M5 during a tool change, dialog note, translations and page order.');
})().catch(e=>{console.error(e);process.exitCode=1;});
