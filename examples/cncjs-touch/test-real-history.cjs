const assert=require('assert'),fs=require('fs'),vm=require('vm');
const context={};vm.runInNewContext(fs.readFileSync(__dirname+'/touch/session-journal.js','utf8'),context);
const api=context.cncSessionJournal,j=api.create(()=>Date.UTC(2026,9,14,12));
// In compact mode, HTTP state owns connection history; unused Socket.IO cannot
// manufacture disconnects while the authenticated stream continues to work.
{
 const compactJournal=api.create(), transport={transportConnected:true}, compactHandlers={};
 const compactDocument=require('./dom-fixture.cjs').createDOM([]).document;
 const compactWindow={cncSessionJournal:{create:()=>compactJournal},cncState:{get:()=>transport},CNCJobStream:{},
  cncSocket:{connected:false,on(){throw Error('No native socket dependency in compact history');}},addEventListener(n,f){compactHandlers[n]=f;}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/real-history.js','utf8'),{document:compactDocument,window:compactWindow,Blob,Date});
 compactHandlers['cnc-job-status']({detail:{simulation:false,machine:null}});
 assert.equal(compactJournal.report().events.filter(e=>e.kind==='connection').length,1);
 transport.transportConnected=false;compactHandlers['cnc-job-status']({detail:{simulation:false,machine:null}});
 assert.equal(compactJournal.report().events.filter(e=>e.kind==='connection').length,2);
}
const machine={port:'/dev/test',fresh:true,name:'part.gcode',originalName:'Pièce.gcode',revision:'one',activeState:'Idle',workflow:'idle',token:'SECRET',nonce:'SECRET',settings:{secret:'SECRET'}};
assert(j.connection(true));assert(!j.connection(true));assert(j.observe(machine));
let count=j.report().events.length;
for(let i=0;i<100;i++)assert(!j.observe({...machine,sent:i,received:i}));
assert.equal(j.report().events.length,count);
assert(j.observe({...machine,activeState:'Run',workflow:'running'}));
assert(j.observe({...machine,activeState:'Hold',workflow:'paused'}));
assert.match(api.text(j.report()),/en pause/);
assert(j.observe({...machine,fresh:false}));assert(!j.observe(null));assert(!j.observe({...machine,fresh:false}));
assert(j.observe(machine));assert.match(j.report().events.at(-1).message,/Journal ouvert/);
assert(!JSON.stringify(j.report()).includes('SECRET'));
assert(j.observe({...machine,revision:'two'}));assert.equal(j.report().events[0].message,'Fichier chargé dans CNCjs.');
assert(j.observe({...machine,port:'/dev/other',revision:'two'}));
assert(j.observe({...machine,name:'',originalName:'',revision:'',loading:true}));
assert(j.observe({...machine,revision:'three',loading:false}));
const snapshot=j.report();snapshot.events[0].message='TAMPERED';assert.notEqual(j.report().events[0].message,'TAMPERED');
for(let i=0;i<150;i++)j.connection(i%2===0);
assert.equal(j.report().events.length,100);assert(j.report().events[0].id>j.report().events[99].id);

// DOM adapter: hidden views and unchanged polls do not repaint; no sockets emit or requests exist.
let download;
const {document,nodes:ids,activeScreens,stats}=require('./dom-fixture.cjs').createDOM([]);
const handlers={},socketHandlers={};
const window={cncSessionJournal:api,cncSocket:{connected:true,on(n,f){socketHandlers[n]=f;},emit(){throw Error('No commands permitted');}},addEventListener(n,f){handlers[n]=f;},navigator:{msSaveOrOpenBlob(blob,name){download={blob,name};}}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/real-history.js','utf8'),{document,window,Blob,Date});
const status=m=>handlers['cnc-job-status']({detail:{machine:m,simulation:false}});
status(machine);assert.equal(stats.writes,0);
activeScreens.add('history');handlers['cnc-screen-change']({detail:'history'});assert(stats.writes>0);
const writes=stats.writes,first=ids['real-history-list'].children[0];
for(let i=0;i<50;i++)status(machine);assert.equal(stats.writes,writes);assert.strictEqual(ids['real-history-list'].children[0],first);
handlers['cnc-job-status']({detail:{machine:{...machine,activeState:'Alarm'},simulation:true}});assert.equal(stats.writes,writes);
handlers['cnc-history-page-size']({detail:3});assert.equal(ids['real-history-list'].children.length,3);
ids['real-history-next'].handlers.click();assert.match(ids['real-history-page'].textContent,/Page 2/);
ids['real-history-prev'].handlers.click();assert.match(ids['real-history-page'].textContent,/Page 1/);
activeScreens.clear();status({...machine,activeState:'Alarm'});const hiddenCount=stats.writes;
socketHandlers.disconnect();socketHandlers.disconnect();assert.equal(stats.writes,hiddenCount);
activeScreens.add('history');handlers['cnc-screen-change']({detail:'history'});assert(stats.writes>hiddenCount);
ids['real-export-json'].handlers.click();assert.match(download.name,/^cnc-journal-.*\.json$/);
download.blob.text().then(content=>{
 const report=JSON.parse(content);assert.equal(report.mode,'interface-reelle');assert(!content.includes('SECRET'));
 assert.equal(report.events.filter(e=>e.kind==='connection'&&e.message.includes('indisponible')).length,1);
 ids['real-export-text'].handlers.click();assert.match(download.name,/\.txt$/);
 console.log('PASS: real journal transitions, freshness, deduplication, 100-event cap, export whitelist, pagination, simulation isolation and zero hidden/unchanged repaint.');
}).catch(e=>{console.error(e);process.exitCode=1;});
