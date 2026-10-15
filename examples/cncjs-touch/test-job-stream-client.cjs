'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=10000, nextTimer=0;const intervals=new Map(), requests=[],events=[],listeners={},nodes={};
class Clock extends Date {static now(){return now;}}
function el(id){return nodes[id]||(nodes[id]={id,value:'',textContent:'',hidden:false,disabled:false,handlers:{},attributes:{},addEventListener(n,f){(this.handlers[n]||(this.handlers[n]=[])).push(f);},removeEventListener(n,f){this.handlers[n]=(this.handlers[n]||[]).filter(x=>x!==f);},click(){if(!this.disabled)(this.handlers.click||[]).forEach(f=>f.call(this));},appendChild(){},insertBefore(){},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},focus(){}});}
function XHR(){this.responseText='';this.status=0;this.headers={};this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=(k,v)=>this.headers[k]=v;this.send=body=>{this.body=body&&JSON.parse(body);requests.push(this);};this.abort=()=>this.aborted=true;}
const window={location:{pathname:'/cnc/touch/'},XMLHttpRequest:XHR,setInterval(fn){intervals.set(++nextTimer,fn);return nextTimer;},clearInterval(id){intervals.delete(id);},addEventListener(n,f){(listeners[n]||(listeners[n]=[])).push(f);},removeEventListener(n,f){listeners[n]=(listeners[n]||[]).filter(x=>x!==f);},dispatchEvent(e){events.push(e);(listeners[e.type]||[]).forEach(f=>f(e));}};
window.cncSocket={connected:false,on(){throw Error('Unsubscribed Socket.IO must not gate the compact HTTP stream');}};
const document={hidden:false,body:{appendChild(){},getAttribute(){return null;}},querySelector:()=>el('panel'),getElementById:el,createElement:()=>el('option'),addEventListener:window.addEventListener,removeEventListener:window.removeEventListener};
const context={window,document,XMLHttpRequest:XHR,localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'offline-fixture'}}})},CustomEvent:function(type,o){this.type=type;this.detail=o.detail;},Date:Clock,Promise,setInterval:window.setInterval,clearInterval:window.clearInterval};
vm.createContext(context);for(const file of ['cnc-state.js','job-stream.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
const flush=()=>new Promise(setImmediate);
function answer(xhr,body,status=200){xhr.status=status;xhr.responseText=JSON.stringify(body);xhr.onload();}
function packet(seq,controllers,transportId='stream-one'){return {version:1,epoch:'server-one',sequence:seq,sentAt:now,transportId,controllers};}
function push(xhr,data){xhr.status=200;xhr.responseText+=JSON.stringify(data)+'\n';xhr.onprogress();}
function machine(port='A'){return {port,controllerId:port,generation:'gen-'+port,type:'Grbl',activeState:'Idle',workflow:'idle',fresh:true,statusAgeMs:0,statusObservedAt:now,name:'test.nc',originalName:'Test',revision:'rev',total:10,received:0,canLoad:true,canStart:true,canResume:false,canPause:false,canStop:false,probeInput:{state:'free',fresh:true,ageMs:0,observedAt:now}};}
(async()=>{
  const health=requests.find(r=>r.url.endsWith('/custom/health')), initial=requests.find(r=>r.url.endsWith('/touch-job'));
  assert(health.url.startsWith('/cnc/api/'));assert.equal(health.headers.Authorization,'Bearer offline-fixture');
  answer(health,{loaded:true,protocol:1});const stream=requests.find(r=>r.url.endsWith('/touch-events'));
  push(stream,packet(9,[]));assert.equal(window.cncState.get().transportConnected,true,'a recent empty stream is a connected server');assert.equal(window.cncState.get().machine,null);
  for(const action of ['load','start','resume','pause','stop'])assert.equal(el('job-'+action).disabled,true,'no controller must keep '+action+' disabled');
  push(stream,packet(10,[machine()]));assert.equal(el('job-start').disabled,false);
  answer(initial,packet(1,[]));await flush();assert.equal(el('job-start').disabled,false); // older snapshot ignored
  const httpAtStart=requests.length;
  for(let i=0;i<20;i++){now+=1000;push(stream,packet(11+i,[machine()]));Array.from(intervals.values()).forEach(fn=>fn());await flush();}
  assert.equal(requests.length,httpAtStart,'healthy stream must replace polling');
  let immediate;window.cncState.subscribe(s=>immediate=s);assert.equal(immediate.machine.port,'A');
  push(stream,packet(40,[machine('A'),machine('B')]));assert.equal(el('job-start').disabled,true,'second controller cancels implicit single selection');
  assert.equal(window.cncState.get().transportConnected,true,'choosing between controllers must not disconnect the server');assert.equal(window.cncState.get().machine,null);
  el('job-port').value='B';el('job-port').handlers.change[0]();assert.equal(window.cncState.get().machine.port,'B');
  el('job-start').click();const preparing=requests.at(-1);assert.equal(preparing.body.port,'B');assert.equal(preparing.body.generation,'gen-B');assert.equal(preparing.body.transportId,'stream-one');
  el('job-dismiss').click();answer(preparing,{nonce:'stale-ticket',name:'Test',expiresIn:15});await flush();assert.equal(el('job-dialog').hidden,true,'cancelled prepare must never reopen');
  el('job-start').click();const delayed=requests.at(-1);now+=16000;answer(delayed,{nonce:'expired-ticket',name:'Test',expiresIn:15});await flush();assert.equal(el('job-dialog').hidden,true);
  // Heartbeats containing old raw state must not preserve executable capabilities.
  const stale=machine('B');stale.statusAgeMs=2600;stale.fresh=false;stale.canStart=false;stale.canLoad=false;
  push(stream,packet(41,[stale]));assert.equal(el('job-start').disabled,true);assert.equal(window.cncState.get().machine.fresh,false);
  const active=machine('B');active.workflow='running';active.activeState='Run';active.canStart=false;active.canPause=true;active.canStop=true;
  push(stream,packet(42,[active]));el('job-pause').click();const pause=requests.at(-1);el('job-stop').click();const stop=requests.at(-1);
  answer(stop,{message:'STOP newer',snapshot:packet(44,[machine('B')])});await flush();assert.equal(el('job-port').disabled,true,'pause still pending');
  answer(pause,{message:'Pause older',snapshot:packet(43,[active])});await flush();assert.equal(el('job-feedback').textContent,'STOP newer');assert.equal(window.cncState.get().machine.workflow,'idle');assert.equal(el('job-port').disabled,false);
  // No data for 3 s: abort proxy-buffered response; retry bounded to 30 s.
  now+=3001;Array.from(intervals.values()).forEach(fn=>fn());await flush();assert(stream.aborted);assert.equal(el('job-start').disabled,true);
  const streamsBefore=requests.filter(r=>r.url.endsWith('/touch-events')).length;
  for(let i=0;i<20;i++){now+=1000;Array.from(intervals.values()).forEach(fn=>fn());await flush();}
  assert.equal(requests.filter(r=>r.url.endsWith('/touch-events')).length,streamsBefore);
  const pendingGet=requests.filter(r=>r.url.endsWith('/touch-job')&&r.method==='GET'&&!r.aborted).at(-1);
  if(pendingGet&&pendingGet!==initial){answer(pendingGet,packet(45,[machine('B')]));await flush();}
  assert.equal(el('job-start').disabled,true,'fallback GET must not restore start without a live stream');assert.equal(el('job-resume').disabled,true);assert.equal(window.cncState.get().transportConnected,false);
  window.cncJobControls.dispose();assert.equal(intervals.size,0);assert(requests.filter(r=>r.url.endsWith('/touch-events')).every(r=>r.aborted));
  // Legacy backend: diagnose it, retain read-only fallback, never enable activation
  // from a boolean freshness flag with no timestamp/identity protocol.
  Object.keys(nodes).forEach(key=>delete nodes[key]);requests.length=0;
  for(const file of ['cnc-state.js','job-stream.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
  answer(requests.find(r=>r.url.endsWith('/custom/health')),{message:'missing'},404);
  answer(requests.find(r=>r.url.endsWith('/touch-job')),{controllers:[machine()]});await flush();
  assert.equal(el('job-start').disabled,true);assert.equal(el('job-load').disabled,true);assert.match(window.cncState.get().transportReason,/absent|incompatible/);
  const answered=new Set(requests);
  for(let i=0;i<59;i++){
    now+=1000;Array.from(intervals.values()).forEach(fn=>fn());
    for(const xhr of requests){if(answered.has(xhr))continue;answered.add(xhr);answer(xhr,xhr.url.endsWith('/custom/health')?{message:'missing'}:{controllers:[machine()]},xhr.url.endsWith('/custom/health')?404:200);}
    await flush();
  }
  assert(requests.length<10,'legacy fallback and health must stay below 10 requests per minute');
  assert.equal(requests.filter(r=>r.url.endsWith('/touch-events')).length,0);assert.equal(el('job-start').disabled,true);
  window.cncJobControls.dispose();assert.equal(intervals.size,0);
  // Normal bounded rotation reconnects once, without carrying confirmation/session state.
  Object.keys(nodes).forEach(key=>delete nodes[key]);requests.length=0;
  for(const file of ['cnc-state.js','job-stream.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
  answer(requests.find(r=>r.url.endsWith('/custom/health')),{loaded:true,protocol:1});
  const rotating=requests.find(r=>r.url.endsWith('/touch-events'));
  push(rotating,packet(1,[machine()]));push(rotating,{rotate:true});rotating.onload();
  assert(rotating.aborted);assert.equal(requests.filter(r=>r.url.endsWith('/touch-events')).length,2);assert.equal(el('job-start').disabled,true);
  push(requests.filter(r=>r.url.endsWith('/touch-events')).at(-1),packet(2,[machine()],'stream-two'));assert.equal(el('job-start').disabled,false);
  window.dispatchEvent({type:'pagehide',persisted:true});assert(intervals.size>0,'BFcache must keep lifecycle timers');assert.equal(el('job-start').disabled,true);
  now+=31000;window.dispatchEvent({type:'pageshow',persisted:true});Array.from(intervals.values()).forEach(fn=>fn());
  const restored=requests.filter(r=>r.url.endsWith('/touch-events')).at(-1);
  push(restored,packet(3,[machine()],'stream-restored'));assert.equal(el('job-start').disabled,false,'BFcache return must restore subscriptions');
  push(restored,packet(4,[],'stream-restored'));assert.equal(window.cncState.get().transportConnected,true);assert.equal(window.cncState.get().machine,null);
  now+=3001;Array.from(intervals.values()).forEach(fn=>fn());assert.equal(window.cncState.get().transportConnected,false);
  assert.equal(events.filter(event=>event.type==='cnc-job-status').at(-1).detail.transportConnected,false,'transport loss without a selected controller must still notify journal consumers');
  window.cncJobControls.dispose();assert.equal(intervals.size,0);
  console.log('PASS: new NDJSON client/store integration, auth/prefix, ordered snapshots, explicit multi-port selection, cancelled/expired confirms, raw freshness, concurrent STOP, silence backoff and disposal; zero network.');
})().catch(error=>{console.error(error);process.exitCode=1;});
