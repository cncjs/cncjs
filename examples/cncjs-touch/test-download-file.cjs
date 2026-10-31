'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(){
 const dom=require('./dom-fixture.cjs').createDOM([]),handlers={},pending=new Map(),blobs=[],revoked=[],clicks=[];
 let next=0,fail='';const originalCreate=dom.document.createElement,append=dom.document.body.appendChild;
 dom.document.createElement=function(tag){if(fail==='create')throw Error('create');const el=originalCreate(tag);if(tag==='a')el.click=function(){if(fail==='click')throw Error('click');clicks.push({url:this.href,name:this.download});};return el;};
 dom.document.body.appendChild=function(el){if(fail==='append')throw Error('append');return append.call(this,el);};
 const window={navigator:{},addEventListener(n,fn){const previous=handlers[n];handlers[n]=previous?e=>{previous(e);fn(e);}:fn;},dispatchEvent(e){if(handlers[e.type])handlers[e.type](e);},
  URL:{createObjectURL(blob){if(fail==='url')throw Error('url');const url='blob:fixture/'+blobs.length;blobs.push({url,blob});return url;},revokeObjectURL:url=>revoked.push(url)}};
 const context={window,document:dom.document,Date,Blob,Promise,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
  setTimeout(fn,ms){if(fail==='timer')throw Error('timer');assert.equal(ms,30000);pending.set(++next,fn);return next;},clearTimeout:id=>pending.delete(id)};
 vm.createContext(context);
 function load(...names){names.forEach(name=>vm.runInContext(fs.readFileSync(__dirname+'/touch/'+name+'.js','utf8'),context));}
 load('download-file');
 return {...dom,window,context,load,handlers,pending,blobs,revoked,clicks,setFail:value=>fail=value,
   expire(){for(const [id,fn] of [...pending]){pending.delete(id);fn();}}};
}
const flush=()=>new Promise(setImmediate);
(async()=>{
 let f=fixture();const payload=new Blob(['État — español'],{type:'text/plain;charset=utf-8'});
 f.window.CNCDownload.save(payload,'rapport.txt');assert.equal(f.clicks[0].name,'rapport.txt');assert.equal(f.document.body.children.length,0);
 assert.equal(f.revoked.length,0,'Do not revoke before download startup');assert.equal(f.pending.size,1);
 assert.equal(await f.blobs[0].blob.text(),'État — español');f.expire();assert.deepEqual(f.revoked,['blob:fixture/0']);assert.equal(f.pending.size,0);
 for(const phase of ['url','create','append','click','timer']){
  f=fixture();f.setFail(phase);assert.throws(()=>f.window.CNCDownload.save(payload,'x.txt'),/indisponible/);
  assert.equal(f.document.body.children.length,0);assert.equal(f.pending.size,0);assert.equal(f.revoked.length,phase==='url'?0:1);
 }
 f=fixture();for(let i=0;i<100;i++)f.window.CNCDownload.save(payload,'report-'+i+'.txt');
 assert.equal(f.document.body.children.length,0);assert.equal(f.pending.size,100);f.expire();
 assert.equal(f.pending.size,0);assert.equal(new Set(f.revoked).size,100);
 f.window.CNCDownload.save(payload,'before-hide.txt');const late=[...f.pending.values()][0];
 f.handlers.pagehide({persisted:true});f.handlers.pagehide({persisted:true});late();
 assert.equal(f.pending.size,0);assert.equal(f.revoked.length,101);
 f.window.CNCDownload.save(payload,'after-return.txt');f.expire();assert.equal(f.revoked.length,102);
 f=fixture();let legacy;f.window.navigator.msSaveOrOpenBlob=function(blob,name){assert.equal(this,f.window.navigator);legacy={blob,name};};
 f.window.CNCDownload.save(payload,'legacy.txt');assert.equal(legacy.blob,payload);assert.equal(f.blobs.length,0);assert.equal(f.pending.size,0);
 f.window.navigator.msSaveOrOpenBlob=()=>false;assert.throws(()=>f.window.CNCDownload.save(payload,'declined.txt'),/indisponible/);
 f=fixture();delete f.window.URL;assert.throws(()=>f.window.CNCDownload.save(payload,'unsupported.txt'),/indisponible/);
 // Exercise the real and simulated journal export buttons; inspect the generated UTF-8 data.
 f=fixture();f.load('session-journal','real-history');f.node('real-export-json').click();
 let report=JSON.parse(await f.blobs[0].blob.text());assert.equal(report.mode,'interface-reelle');assert.equal(report.events.length,1);
 f.node('real-export-text').click();assert.match(await f.blobs[1].blob.text(),/Journal/);f.expire();
 f=fixture();f.load('job-simulation','simulation-report','simulation-history');
 await f.window.cncJobSimulation.request('POST',{port:'SIMULATION',action:'load',file:'Pièce_ñ.nc'});
 f.node('sim-export-json').click();assert(f.node('sim-export-json').disabled);await flush();
 report=JSON.parse(await f.blobs[0].blob.text());assert.equal(report.finalState.file,'Pièce_ñ.nc');assert.equal(report.format,'cnc-touch-simulation-report');
 assert.equal(f.node('sim-export-json').disabled,false);f.setFail('click');f.node('sim-export-text').click();await flush();
 assert.match(f.node('sim-export-status').textContent,/Export impossible/);assert.equal(f.node('sim-export-text').disabled,false);f.expire();
 // A delayed local snapshot must not download after page exit or unlock a newer export on return.
 f=fixture();f.load('job-simulation','simulation-report','simulation-history');
 const snapshot=await f.window.cncJobSimulation.request('GET'),resolvers=[];
 f.window.cncJobSimulation.request=()=>new Promise(resolve=>resolvers.push(resolve));
 f.node('sim-export-json').click();f.handlers.pagehide({persisted:true});
 assert.equal(f.node('sim-export-json').disabled,false);f.node('sim-export-json').click();
 resolvers[0](snapshot);await flush();assert.equal(f.blobs.length,0);assert(f.node('sim-export-json').disabled);
 resolvers[1](snapshot);await flush();assert.equal(f.blobs.length,1);assert.equal(f.node('sim-export-json').disabled,false);f.expire();
 // Probe profiles and probe results share the same cleanup/error behavior.
 f=fixture();f.document.body.setAttribute('data-simulation','true');f.node('probe-confirm').parentElement=f.document.body;
 Object.assign(f.window,{CNCProbe:require('./touch/probe-model'),CNCProbeTransfer:require('./touch/probe-transfer'),CNCProbeProfiles:require('./touch/probe-profiles'),CNCProfileStorage:require('./touch/profile-storage')});
 f.context.localStorage={getItem:()=>null,setItem(){throw Error('Export must not write profiles');}};
 f.load('probe-ui');f.node('probe-profiles-export').click();
 const profileText=await f.blobs[0].blob.text();assert.equal(JSON.parse(profileText).mode,'simulation');
 assert.equal(f.window.CNCProbeTransfer.decode(profileText,'simulation').length,1);
 f.node('probe-export').click();JSON.parse(await f.blobs[1].blob.text());assert.match(f.clicks[1].name,/^cnc-palpage-simulation-/);
 f.setFail('click');f.node('probe-profiles-export').click();f.node('probe-export').click();
 assert.match(f.node('probe-transfer-export-status').textContent,/Export impossible/);assert.match(f.node('probe-export-status').textContent,/Export impossible/);
 f.expire();assert.equal(f.pending.size,0);assert.equal(f.revoked.length,4);
 for(const name of ['index.html','simulation.html']){
  const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');assert.equal((html.match(/src="download-file\.js/g)||[]).length,1);
  for(const script of ['probe-ui.js',name==='index.html'?'real-history.js':'simulation-history.js'])assert(html.indexOf('download-file.js')<html.indexOf(script));
 }
 console.log('PASS: all export buttons, UTF-8/JSON round trips, repeated downloads, failure cleanup, delayed release, pagehide/BFcache, legacy browser and retry after failure; no network.');
})().catch(error=>{console.error(error);process.exitCode=1;});
