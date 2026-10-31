'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let wrote=false,writes=0,reads=0,id=0,active,ready=0;
const queue=new Map(),observers=[],handlers=new Map();
function style(){return new Proxy({}, {set(o,k,v){wrote=true;writes++;o[k]=v;return true;}});}
function read(value){assert(!wrote,'Geometry read after a write in the same frame');reads++;return value;}
function element(height){const e={style:style(),nodeType:1,hidden:false};e.classList={contains:n=>n==='screen'||n==='active'&&active===e};Object.defineProperties(e,{scrollWidth:{get:()=>read(parseFloat(e.style.width)||1000)},scrollHeight:{get:()=>read(height)}});return e;}
const first=element(1600),second=element(700);active=first;
const main={style:style(),querySelector:()=>active,set scrollTop(v){wrote=true;},set scrollLeft(v){wrote=true;},get clientWidth(){return read(1280);}};
first.parentElement=second.parentElement=main;
function on(name,fn){handlers.set(name,fn);}
function off(name,fn){if(handlers.get(name)===fn)handlers.delete(name);}
const context={requestAnimationFrame(fn){const next=++id;queue.set(next,fn);return next;},
 MutationObserver:function(fn){this.callback=fn;this.targets=[];this.observe=t=>this.targets.push(t);this.disconnect=()=>{this.targets=[];};observers.push(this);},
 window:{innerWidth:1366,innerHeight:768,addEventListener:on,removeEventListener:off,cancelAnimationFrame:i=>queue.delete(i)},
 document:{querySelector:()=>main,getElementById:()=>null,body:{classList:{contains:n=>n==='ks-ui'}},documentElement:{style:{setProperty(){wrote=true;}}},addEventListener:(n,f)=>on('doc:'+n,f),removeEventListener:(n,f)=>off('doc:'+n,f)}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/viewport-fit.js','utf8'),context);
function flush(){let count=0;while(queue.size){assert(++count<30,'Fit did not settle');const [i,fn]=queue.entries().next().value;queue.delete(i);wrote=false;fn();}return count;}
context.window.cncViewportFit.whenReady(()=>ready++);
assert(flush()>1,'Width-dependent layout must use separate frames');assert.equal(ready,1);
assert.deepEqual(observers[0].targets,[first]);
for(let n=0;n<10;n++){active=n%2?first:second;handlers.get('cnc-screen-change')();flush();assert.deepEqual(observers[0].targets,[active]);}
const oldWrites=writes;handlers.get('doc:click')();flush();assert.equal(writes,oldWrites);
// Returning to the previous geometry before measurement must not leave scale=none.
context.window.innerHeight=600;handlers.get('resize')();
{const [i,fn]=queue.entries().next().value;queue.delete(i);wrote=false;fn();}
assert.equal(active.style.transform,'none');
// No intermediate measurement frame may be painted: the screen stays invisible until its final scale.
assert.equal(active.style.visibility,'hidden','screen hidden while measured');
context.window.innerHeight=768;handlers.get('resize')();flush();
assert.match(active.style.transform,/^scale\(/);assert.equal(active.style.visibility,'','screen shown with its final scale');
// Leaving a screen mid-measurement must not leave it invisible when it is shown again.
const measured=active;context.window.innerHeight=640;handlers.get('resize')();
{const [i,fn]=queue.entries().next().value;queue.delete(i);wrote=false;fn();}
assert.equal(measured.style.visibility,'hidden');
active=measured===first?second:first;handlers.get('cnc-screen-change')();flush();
active=measured;handlers.get('cnc-screen-change')();flush();
assert.equal(measured.style.visibility,'');assert.match(measured.style.transform,/^scale\(/);
const settledWrites=writes;handlers.get('doc:click')();flush();assert.equal(writes,settledWrites,'revealed screens cost no writes on revisit');
handlers.get('pagehide')({persisted:true});assert(handlers.has('resize'),'BFCache page remains resumable');
context.window.cncViewportFit.dispose();context.window.cncViewportFit.dispose();
assert.equal(handlers.size,0);assert(observers.every(o=>o.targets.length===0));assert.equal(queue.size,0);assert(reads>0);
console.log('PASS viewport: separated layout phases, active observer ownership, stable revisits, ready callback, disposal and BFCache.');
