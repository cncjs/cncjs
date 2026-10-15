'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function fixture(simulation=false){
 const {document,node,activeScreens,stats}=require('./dom-fixture.cjs').createDOM(['machine']);
 document.body.getAttribute=()=>simulation?'true':null;
 const listeners={},subscribers=[];let now=10000;
 const store={subscribe(fn){subscribers.push(fn);fn({});return()=>subscribers.splice(subscribers.indexOf(fn),1);}};
 const window={cncState:store,addEventListener(n,f){listeners[n]=f;},removeEventListener(n){delete listeners[n];}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/connection-status.js','utf8'),{document,window,Date:{now:()=>now}});
 const panel=node('panel').children[0],report=panel.children.find(e=>e.id==='connection-report'),reason=panel.children.find(e=>e.id==='connection-explanation');
 const transport=panel.children.find(e=>e.id==='connection-transport'),badge=node('status-bar').children[0];
 const send=state=>subscribers.slice().forEach(fn=>fn(state));
 return {document,node,activeScreens,stats,window,listeners,subscribers,send,report,reason,transport,badge,advance:ms=>now+=ms};
}
let f=fixture();const state=(age=0,patch={})=>({transportConnected:true,machine:{port:'A',fresh:true,statusAgeMs:age,...patch}});
f.send({transportConnected:true,machine:null});assert.match(f.transport.textContent,/connecté/);assert.match(f.report.textContent,/aucun contrôleur/);assert.match(f.badge.className,/warn/);
f.send(state(500));assert.match(f.report.textContent,/récent/);assert.match(f.badge.className,/ok/);
let writes=f.stats.writes;for(let i=0;i<20;i++)f.send(state(500,{received:i}));assert.equal(f.stats.writes,writes,'no unchanged DOM writes');
f.send(state(2600));assert.match(f.report.textContent,/non exploitable/);assert.match(f.reason.textContent,/trop ancien/);assert.match(f.badge.className,/warn/);
f.send(state(15000));assert.match(f.badge.className,/err/);assert.match(f.badge.textContent,/15 s/);
f.send(state(60001));assert.match(f.badge.textContent,/2 min/);
for(const age of [null,undefined,-1,NaN,Infinity,'0']){f.send(state(0,{statusAgeMs:age}));assert.match(f.report.textContent,/inconnu/);assert.match(f.badge.className,/warn/);}
f.send({...state(0),transportConnected:false});assert.match(f.transport.textContent,/indisponible/);assert.match(f.badge.className,/warn/);assert.match(f.reason.textContent,/rétabli/);
f.send(state(0,{fresh:false}));assert.match(f.reason.textContent,/non validé/);
f.send({...state(),transportReason:'Session expirée'});assert.equal(f.reason.textContent,'Session expirée');
// A hidden Machine view receives state but does not repaint its details.
f.activeScreens.clear();const before=f.report.textContent;f.send(state(8000,{port:'B'}));assert.equal(f.report.textContent,before);assert.match(f.badge.textContent,/8 s/);
f.activeScreens.add('machine');f.listeners['cnc-screen-change']();assert.match(f.report.textContent,/B.*8 s/);
f.document.hidden=true;writes=f.stats.writes;f.send(state(16000));assert.equal(f.stats.writes,writes);
f.document.hidden=false;f.document.handlers.visibilitychange();assert.match(f.report.className,/err/);
const retained=state(0);f.send(retained);f.document.hidden=true;f.advance(16000);f.send({...retained,selection:{file:'other.nc'}});
f.document.hidden=false;f.document.handlers.visibilitychange();assert.match(f.report.className,/err/,'visibility and unrelated store changes cannot refresh an old report');
f.listeners.pagehide({persisted:true});assert.equal(f.subscribers.length,1);f.listeners.pagehide({persisted:false});assert.equal(f.subscribers.length,0);assert.equal(Object.keys(f.listeners).length,0);assert.equal(Object.keys(f.document.handlers).length,0);
f=fixture(true);f.send(state(0));assert.match(f.transport.textContent,/aucune liaison/);assert.match(f.report.textContent,/non utilisés/);assert.equal(f.badge,undefined);
console.log('PASS: transport versus report freshness, conservative age/unknown thresholds, fallback and protocol failure, identity, no unchanged/hidden writes, simulation distinction and listener cleanup; no timers/network APIs.');
