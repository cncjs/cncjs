'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
async function fixture(monotonic=false){
 const nodes={},events={},timers=[],calls=[];let now=100000,elapsed=100000,pending=null;
 const doc={hidden:false,activeElement:null};
 const node=id=>nodes[id]||(nodes[id]={id,tagName:'DIV',hidden:false,inert:false,isConnected:true,disabled:false,value:'',textContent:'',handlers:{},
  addEventListener(n,f){this.handlers[n]=f;},removeEventListener(n){delete this.handlers[n];},
  appendChild(){},insertBefore(){},setAttribute(){},getAttribute(){return null;},
  getClientRects(){return this.hidden?[]:[{}];},focus(){doc.activeElement=this;},
  contains(target){return target===this||(this.id==='job-dialog'&&['job-check','job-confirm','job-dismiss'].includes(target.id));},
  click(){if(!this.disabled&&this.handlers.click)this.handlers.click.call(this,{});}
 });
 const on=(name,fn)=>(events[name]||(events[name]=[])).push(fn);
 const emit=(name,event={})=>(events[name]||[]).slice().forEach(f=>f(event));
 Object.assign(doc,{body:{children:[node('main'),node('previously-inert'),node('job-dialog')],getAttribute:()=> 'true',appendChild(){}},
  querySelector:()=>node('panel'),querySelectorAll:()=>[node('job-dialog'),node('other-dialog')],getElementById:node,createElement:()=>node('option'),
  addEventListener:on,removeEventListener(n,f){events[n]=(events[n]||[]).filter(x=>x!==f);}});
 node('previously-inert').inert=true;node('job-dialog').hidden=true;node('other-dialog').hidden=true;
 const machine={port:'SIMULATION',type:'Virtual',generation:'g1',revision:1,name:'leaf.nc',fresh:true,statusAgeMs:0,activeState:'Idle',workflow:'idle',canLoad:true,canStart:true,canResume:false,canStop:false};
 const snapshot=()=>({controllers:[Object.assign({},machine)]});
 const sim={request(method,body){if(method==='GET')return Promise.resolve(snapshot());calls.push(body);if(body.action==='prepare')return new Promise(resolve=>pending=resolve);return Promise.resolve({});}};
 const win={cncJobSimulation:sim,addEventListener:on,removeEventListener:doc.removeEventListener,dispatchEvent(){}};
 if(monotonic)win.performance={now:()=>elapsed};
 const ctx={window:win,document:doc,Date:{now:()=>now},Promise,CustomEvent:function(){},setInterval:f=>{timers.push(f);return 1;},clearInterval(){},XMLHttpRequest(){throw Error('No hardware/network permitted');}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/job-controls.js','utf8'),ctx);
 const flush=()=>new Promise(setImmediate);await flush();
 const begin=async()=>{node('home-job-start').focus();node('job-start').click();await flush();};
 const resolve=async()=>{const f=pending;pending=null;f({nonce:'ticket',name:'leaf.nc',expiresIn:15});await flush();};
 const open=async()=>{await begin();await resolve();assert.equal(node('job-dialog').hidden,false);};
 const check=()=>{node('job-check').checked=true;node('job-check').handlers.change.call(node('job-check'));};
 return {node,doc,win,machine,calls,emit,flush,begin,resolve,open,check,advance(ms){now+=ms;elapsed+=ms;},jumpWall:ms=>now+=ms};
}
(async()=>{
 for(const jump of [-3600000,3600000]){
   const timed=await fixture(true);await timed.open();timed.jumpWall(jump);timed.advance(14999);
   timed.win.cncJobControls.refresh();await timed.flush();timed.check();assert.equal(timed.node('job-confirm').disabled,false);
   timed.advance(1);timed.check();assert.equal(timed.node('job-confirm').disabled,true,'Expires after exactly 15 elapsed seconds');
   timed.node('job-confirm').handlers.click();await timed.flush();assert(timed.node('job-dialog').hidden);
   assert(!timed.calls.some(c=>c.action==='start'));
 }
 {
   const timed=await fixture(true);await timed.begin();timed.jumpWall(-3600000);timed.advance(16000);await timed.resolve();
   assert(timed.node('job-dialog').hidden,'A delayed response cannot reopen an expired elapsed-time confirmation');
 }
 let f=await fixture();await f.open();
 assert.equal(f.doc.activeElement.id,'job-dismiss');assert(f.node('main').inert);
 assert.match(f.node('job-countdown').textContent,/15 s/);
 function key(key,shiftKey=false){let prevented=false;f.emit('keydown',{key,shiftKey,preventDefault(){prevented=true;},stopImmediatePropagation(){}});return prevented;}
 assert(key('Tab'));assert.equal(f.doc.activeElement.id,'job-check');
 assert(key('Tab',true));assert.equal(f.doc.activeElement.id,'job-dismiss');
 f.emit('focusin',{target:f.node('main')});assert.equal(f.doc.activeElement.id,'job-dismiss');
 assert(key('Escape'));assert(f.node('job-dialog').hidden);assert(!f.node('main').inert);assert(f.node('previously-inert').inert);
 assert.equal(f.doc.activeElement.id,'home-job-start');
 await f.begin();f.emit('cnc-screen-change');await f.resolve();assert(f.node('job-dialog').hidden,'late response after navigation');
 await f.begin();f.node('other-dialog').hidden=false;await f.resolve();assert(f.node('job-dialog').hidden,'must not stack on another dialog');f.node('other-dialog').hidden=true;
 await f.open();f.check();f.advance(2600);f.node('job-confirm').click();await f.flush();
 assert(f.node('job-dialog').hidden);assert(!f.calls.some(c=>c.action==='start'),'stale report rejected at click without timer');
 f=await fixture();await f.open();f.machine.activeState='Alarm';f.machine.canStart=false;f.win.cncJobControls.refresh();await f.flush();assert(f.node('job-dialog').hidden);assert(!f.node('main').inert);
 f=await fixture();await f.open();f.machine.revision++;f.win.cncJobControls.refresh();await f.flush();assert(f.node('job-dialog').hidden,'file revision invalidates ticket');
 f=await fixture();await f.open();f.doc.hidden=true;f.emit('visibilitychange');assert(f.node('job-dialog').hidden);assert(!f.node('main').inert);
 f=await fixture();await f.open();f.win.cncJobControls.dispose();assert(f.node('job-dialog').hidden);assert(!f.node('main').inert);
 f=await fixture();await f.open();f.check();f.node('job-confirm').click();f.node('job-confirm').click();await f.flush();assert.equal(f.calls.filter(c=>c.action==='start').length,1);
 // Macro confirmation: prepared with the macro id, titled for a macro, gated by canMacro, runs the macro action once.
 f=await fixture();f.machine.canMacro=true;f.machine.macros=[{id:'m1',name:'Dégagement Z'}];f.win.cncJobControls.refresh();await f.flush();
 f.win.cncJobControls.prepareMacro('m1');await f.flush();
 assert.deepEqual(f.calls.at(-1),{action:'prepare',port:'SIMULATION',generation:'g1',operation:'macro',macroId:'m1'});
 await f.resolve();assert.equal(f.node('job-dialog').hidden,false);assert.equal(f.node('job-dialog-title').textContent,'Exécuter la macro');
 f.check();f.node('job-confirm').click();f.node('job-confirm').click();await f.flush();
 assert.equal(f.calls.filter(c=>c.action==='macro').length,1);assert.equal(f.calls.at(-1).nonce,'ticket');assert(f.node('job-dialog').hidden);
 f.machine.canMacro=false;f.machine.macroReason='Travail en cours.';f.win.cncJobControls.prepareMacro('m1');await f.flush();await f.resolve();
 assert(f.node('job-dialog').hidden,'a macro ticket is refused when the machine is not ready for macros');
 // Overrides go through the same command path and need a current machine.
 f.machine.canMacro=true;f.machine.canOverride=true;await f.win.cncJobControls.override('feed',10);
 assert.deepEqual(f.calls.at(-1),{action:'override',port:'SIMULATION',generation:'g1',kind:'feed',value:10});
 console.log('PASS: focus, inert restoration, keyboard trap, delayed prepare, modal exclusion, stale click, alarm/revision invalidation, visibility/disposal and single confirmation; no network.');
})().catch(e=>{console.error(e);process.exitCode=1;});
