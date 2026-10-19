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
  let lateSnapshot;
  window.addEventListener('cnc-job-status',e=>{lateSnapshot=e.detail;});
  (listeners.DOMContentLoaded||[]).forEach(fn=>fn());
  assert.equal(lateSnapshot.machine.port,'A','deferred consumers receive the initial snapshot');
  assert.equal(lateSnapshot.observedAt,now);
  answer(initial,packet(1,[]));await flush();assert.equal(el('job-start').disabled,false); // older snapshot ignored
  const httpAtStart=requests.length;
  for(let i=0;i<20;i++){now+=1000;push(stream,packet(11+i,[machine()]));Array.from(intervals.values()).forEach(fn=>fn());await flush();}
  assert.equal(requests.length,httpAtStart,'healthy stream must replace polling');
  let immediate;window.cncState.subscribe(s=>immediate=s);assert.equal(immediate.machine.port,'A');
  // A second controller appearing while the implicitly selected one runs a job keeps the
  // selection (its Stop must not vanish); once idle, the choice is asked again.
  const busyA=machine('A');busyA.workflow='running';busyA.activeState='Run';busyA.canStop=true;busyA.canPause=true;
  push(stream,packet(31,[busyA]));push(stream,packet(32,[busyA,machine('B')]));
  assert.equal(el('job-port').value,'A');assert.equal(el('job-stop').disabled,false,'Stop of the running controller stays usable');
  push(stream,packet(33,[machine('A')]));
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
  // A job running while the stream is down: the state is read every 2 s, so Stop and
  // Pause (which need a state younger than 3 s) stay usable between two reads.
  const running=machine('B');running.workflow='running';running.activeState='Run';running.canStart=false;running.canPause=true;running.canStop=true;
  window.cncJobControls.refresh();answer(requests.filter(r=>r.url.endsWith('/touch-job')&&r.method==='GET').at(-1),packet(46,[running]));await flush();
  let stopUsable=0;
  for(let i=0;i<20;i++){
    now+=500;Array.from(intervals.values()).forEach(fn=>fn());
    const get=requests.filter(r=>r.url.endsWith('/touch-job')&&r.method==='GET'&&!r.status).at(-1);
    if(get){running.statusObservedAt=now;answer(get,packet(47+i,[running]));}
    await flush();Array.from(intervals.values()).forEach(fn=>fn());
    if(!el('job-stop').disabled)stopUsable++;
  }
  assert.equal(stopUsable,20,'Stop stays usable during a job read by HTTP');
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
  // Until the new stream's first packet, the renewal is not published as a disconnection
  // (the strip would hide Stop, the journal log a loss, the notice push the screen down).
  const renewal=events.filter(e=>e.type==='cnc-job-status').at(-1).detail;
  assert.equal(renewal.transportConnected,true,'a planned renewal is not a disconnection');assert(renewal.machine);
  assert.equal(window.cncState.get().transportReason,'','no notice for a planned renewal');
  push(requests.filter(r=>r.url.endsWith('/touch-events')).at(-1),packet(2,[machine()],'stream-two'));assert.equal(el('job-start').disabled,false);
  // A renewal that does not come back within 3 s is a loss after all.
  const second=requests.filter(r=>r.url.endsWith('/touch-events')).at(-1);push(second,{rotate:true});second.onload();
  assert.equal(window.cncState.get().transportConnected,true);
  now+=3001;Array.from(intervals.values()).forEach(fn=>fn());
  assert.equal(window.cncState.get().transportConnected,false,'no packet within the grace: disconnected');assert.notEqual(window.cncState.get().transportReason,'');
  const beforePageHide=requests.filter(r=>r.url.endsWith('/touch-events')).at(-1);
  window.dispatchEvent({type:'pagehide',persisted:true});assert(intervals.size>0,'BFcache must keep lifecycle timers');assert.equal(el('job-start').disabled,true);
  window.dispatchEvent({type:'pageshow',persisted:true});
  const restored=requests.filter(r=>r.url.endsWith('/touch-events')).at(-1);
  assert.notEqual(restored,beforePageHide,'BFcache return must reopen immediately without the 30-second failure backoff');
  const resumeRequests=requests.length;window.dispatchEvent({type:'visibilitychange'});
  assert.equal(requests.length,resumeRequests,'paired pageshow/visibility events must not reopen twice');
  push(restored,packet(3,[machine()],'stream-restored'));assert.equal(el('job-start').disabled,false,'BFcache return must restore subscriptions');
  push(restored,packet(4,[],'stream-restored'));assert.equal(window.cncState.get().transportConnected,true);assert.equal(window.cncState.get().machine,null);
  now+=3001;Array.from(intervals.values()).forEach(fn=>fn());assert.equal(window.cncState.get().transportConnected,false);
  assert.equal(events.filter(event=>event.type==='cnc-job-status').at(-1).detail.transportConnected,false,'transport loss without a selected controller must still notify journal consumers');
  window.cncJobControls.dispose();assert.equal(intervals.size,0);
  // Bad packets cannot poison sequence tracking or leave a confirmation open,
  // whether they arrive through streaming, fallback GET or a command response.
  for(const source of ['stream','GET','POST']){
    Object.keys(nodes).forEach(key=>delete nodes[key]);requests.length=0;
    for(const file of ['cnc-state.js','job-stream.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
    answer(requests.find(r=>r.url.endsWith('/custom/health')),{loaded:true,protocol:1});
    answer(requests.find(r=>r.url.endsWith('/touch-job')),packet(1,[machine()]));await flush();
    const tested=requests.find(r=>r.url.endsWith('/touch-events'));
    push(tested,packet(2,[machine()]));el('job-start').click();
    const invalid=packet(Infinity,[machine()]); // serialized as null, never a valid sequence
    if(source==='POST')answer(requests.at(-1),{nonce:'invalid-snapshot',name:'Test',expiresIn:15,snapshot:invalid});
    else{
      answer(requests.at(-1),{nonce:'must-close',name:'Test',expiresIn:15});await flush();
      assert.equal(el('job-dialog').hidden,false);
      if(source==='stream')push(tested,packet(2,[machine()]));
      else{window.cncJobControls.refresh();answer(requests.at(-1),invalid);}
    }
    await flush();assert(tested.aborted,source);assert.equal(el('job-dialog').hidden,true,source);
    assert.equal(el('job-start').disabled,true);assert.equal(el('job-confirm').disabled,true);
    assert.equal(window.cncState.get().machine,null);assert.equal(window.cncState.get().transportConnected,false);
    assert.match(window.cncState.get().transportReason,/invalide/);
    now+=31000;Array.from(intervals.values()).forEach(fn=>fn());await flush();
    const recovery=requests.filter(r=>r.url.endsWith('/touch-events')).at(-1);
    assert.notEqual(recovery,tested);push(recovery,packet(4,[machine()],'after-invalid'));
    assert.equal(el('job-start').disabled,false,'Valid state must recover without a poisoned sequence');
    assert.equal(el('job-dialog').hidden,true,'Recovery must require a new confirmation');
    assert(requests.filter(r=>r.method==='POST').every(r=>r.body.action==='prepare'),'No activation or replay');
    window.cncJobControls.dispose();assert.equal(intervals.size,0);
  }
  // Returning from a hidden page invalidates even an apparently recent report.
  // Previously queued GET, POST and stream callbacks cannot revive it.
  for(const hiddenTime of [0,3600000]){
    Object.keys(nodes).forEach(key=>delete nodes[key]);requests.length=0;
    for(const file of ['cnc-state.js','job-stream.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
    answer(requests.find(r=>r.url.endsWith('/custom/health')),{loaded:true,protocol:1});
    const pendingRead=requests.find(r=>r.url.endsWith('/touch-job'));
    const beforeHide=requests.find(r=>r.url.endsWith('/touch-events')),lateProgress=beforeHide.onprogress;
    push(beforeHide,packet(1,[machine()]));el('job-start').click();const pendingPrepare=requests.at(-1);
    document.hidden=true;window.dispatchEvent({type:'visibilitychange'});now+=hiddenTime;
    document.hidden=false;window.dispatchEvent({type:'visibilitychange'});
    assert(beforeHide.aborted);assert.equal(window.cncState.get().machine,null);
    assert.equal(window.cncState.get().transportConnected,false);assert(el('job-start').disabled);
    const afterShow=requests.filter(r=>r.url.endsWith('/touch-events')).at(-1);
    assert.notEqual(afterShow,beforeHide,'return reopens immediately');
    beforeHide.responseText+=JSON.stringify(packet(100,[machine()]))+'\n';lateProgress();
    answer(pendingRead,packet(101,[machine()]));
    answer(pendingPrepare,{nonce:'obsolete',name:'Test',expiresIn:15,snapshot:packet(102,[machine()])});await flush();
    assert.equal(window.cncState.get().machine,null);assert(el('job-dialog').hidden);assert(el('job-start').disabled);
    push(afterShow,packet(2,[machine()],'after-visible'));assert.equal(el('job-start').disabled,false);
    assert(el('job-dialog').hidden);assert.equal(requests.filter(r=>r.method==='POST').length,1,'no command replay');
    assert.equal(requests.find(r=>r.method==='POST').body.action,'prepare');
    window.cncJobControls.dispose();assert.equal(intervals.size,0);
  }
  // Browser offline closes confirmations immediately, ignores in-flight replies,
  // suppresses fallback/stream retries and only recovers after a new health+stream.
  Object.keys(nodes).forEach(key=>delete nodes[key]);requests.length=0;
  for(const file of ['cnc-state.js','job-stream.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
  answer(requests.find(r=>r.url.endsWith('/custom/health')),{loaded:true,protocol:1});
  const beforeOffline=requests.find(r=>r.url.endsWith('/touch-events'));
  const staleProgress=beforeOffline.onprogress;
  push(beforeOffline,packet(1,[machine()]));
  el('job-start').click();const prepareOffline=requests.at(-1);
  window.dispatchEvent({type:'offline'});
  assert(beforeOffline.aborted);assert.equal(el('job-start').disabled,true);assert.equal(window.cncState.get().transportConnected,false);
  assert.match(window.cncState.get().transportReason,/Réseau indisponible/);
  answer(prepareOffline,{nonce:'must-not-reopen',name:'Test',expiresIn:15});await flush();assert.equal(el('job-dialog').hidden,true);
  const offlineRequests=requests.length,posts=requests.filter(r=>r.method==='POST').length;
  document.hidden=true;window.dispatchEvent({type:'visibilitychange'});
  document.hidden=false;window.dispatchEvent({type:'visibilitychange'});
  assert.equal(requests.length,offlineRequests,'returning while offline must not restart requests');
  for(let n=0;n<65;n++){now+=1000;Array.from(intervals.values()).forEach(fn=>fn());await flush();}
  assert.equal(requests.length,offlineRequests,'no fallback/health/stream request while offline');
  staleProgress();assert.equal(window.cncState.get().machine,null,'late stream callback must remain invalid');
  window.dispatchEvent({type:'online'});
  const reconnectHealth=requests.filter(r=>r.url.endsWith('/custom/health')).at(-1);
  assert.notEqual(reconnectHealth,requests[0]);assert(el('job-start').disabled);
  const obsoleteHealthCallback=reconnectHealth.onload;
  window.dispatchEvent({type:'offline'});assert(reconnectHealth.aborted);
  reconnectHealth.status=200;reconnectHealth.responseText='{"loaded":true,"protocol":1}';obsoleteHealthCallback();
  assert.equal(requests.filter(r=>r.url.endsWith('/touch-events')).length,1,'obsolete health cannot open a stream');
  window.dispatchEvent({type:'online'});
  answer(requests.filter(r=>r.url.endsWith('/custom/health')).at(-1),{loaded:true,protocol:1});
  const recovered=requests.filter(r=>r.url.endsWith('/touch-events')).at(-1);
  assert.notEqual(recovered,beforeOffline);assert(el('job-start').disabled);
  push(recovered,packet(2,[machine()],'after-offline'));assert.equal(el('job-start').disabled,false);
  assert.equal(el('job-dialog').hidden,true);assert.equal(requests.filter(r=>r.method==='POST').length,posts,'reconnect must not replay commands');
  el('job-start').click();answer(requests.at(-1),{nonce:'visible-confirmation',name:'Test',expiresIn:15});await flush();
  assert.equal(el('job-dialog').hidden,false);window.dispatchEvent({type:'offline'});
  assert.equal(el('job-dialog').hidden,true);assert.equal(el('job-confirm').disabled,true);
  window.cncJobControls.dispose();assert.equal(intervals.size,0);
  // A page opened while offline does not send even its initial health or fallback GET.
  Object.keys(nodes).forEach(key=>delete nodes[key]);requests.length=0;window.navigator={onLine:false};
  for(const file of ['cnc-state.js','job-stream.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
  assert.equal(requests.length,0);assert(el('job-start').disabled);assert.match(window.cncState.get().transportReason,/Réseau indisponible/);
  window.dispatchEvent({type:'online'});assert(requests.some(r=>r.url.endsWith('/custom/health')));assert(el('job-start').disabled);
  window.cncJobControls.dispose();assert.equal(intervals.size,0);
  const afterDispose=requests.length;window.dispatchEvent({type:'offline'});window.dispatchEvent({type:'online'});assert.equal(requests.length,afterDispose);
  // Local simulation stays usable; browser network events must not contact hardware.
  Object.keys(nodes).forEach(key=>delete nodes[key]);requests.length=0;document.querySelectorAll=()=>[];
  vm.runInContext(fs.readFileSync(__dirname+'/touch/job-simulation.js','utf8'),context);
  await window.cncJobSimulation.request('POST',{port:'SIMULATION',action:'load',file:'offline-simulation.nc'});
  for(const file of ['cnc-state.js','job-controls.js'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),context);
  await flush();assert.equal(el('job-start').disabled,false);
  window.dispatchEvent({type:'offline'});window.dispatchEvent({type:'online'});await flush();
  document.hidden=true;window.dispatchEvent({type:'visibilitychange'});
  document.hidden=false;window.dispatchEvent({type:'visibilitychange'});await flush();
  assert.equal(el('job-start').disabled,false);assert.equal(requests.length,0);
  window.cncJobControls.dispose();assert.equal(intervals.size,0);
  console.log('PASS: NDJSON integration, auth/prefix, ordered snapshots, confirmation lifecycle, freshness, STOP, silence backoff, offline suspension/recovery with no command replay, initially offline and disposal; zero network.');
})().catch(error=>{console.error(error);process.exitCode=1;});
