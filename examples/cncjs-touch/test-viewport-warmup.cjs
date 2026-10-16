'use strict';
// Screens never shown are laid out once, hidden and out of flow, during idle
// time after the first fit; active or already fitted screens are skipped and
// disposal stops the queue. Synthetic layout, no browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function session(options={}){
 let active,writes=0,id=0;const queue=new Map(),idle=[],timers=new Map(),layouts=[];
 function style(){return new Proxy({},{set(o,k,v){writes++;o[k]=v;return true;}});}
 function screen(name){
  const e={id:'screen-'+name,style:style(),nodeType:1,hidden:false,snapshots:[]};
  e.classList={contains:n=>n==='screen'||(n==='active'&&active===e)};
  Object.defineProperties(e,{scrollWidth:{get:()=>parseFloat(e.style.width)||1000},scrollHeight:{get:()=>600},
   offsetHeight:{get(){layouts.push({screen:e.id,display:e.style.display,visibility:e.style.visibility,position:e.style.position,width:e.style.width});return 600;}}});
  return e;
 }
 const screens=['menu','files','home','jog'].map(screen);active=screens[0];
 const main={style:style(),querySelector:()=>active,querySelectorAll:()=>screens,set scrollTop(v){},set scrollLeft(v){},get clientWidth(){return 1280;}};
 screens.forEach(s=>{s.parentElement=main;});
 const context={requestAnimationFrame(fn){const n=++id;queue.set(n,fn);return n;},
  MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{};},
  setTimeout(fn,ms){const n=++id;timers.set(n,{fn,ms});return n;},clearTimeout:n=>timers.delete(n),
  window:{innerWidth:1366,innerHeight:768,addEventListener(){},removeEventListener(){},cancelAnimationFrame:i=>queue.delete(i)},
  document:{querySelector:()=>main,getElementById:()=>null,body:{classList:{contains:n=>n==='ks-ui'}},documentElement:{style:{setProperty(){}}},addEventListener(){},removeEventListener(){}}};
 if(!options.noIdle)context.requestIdleCallback=(fn,opts)=>{assert.equal(opts.timeout,3000);idle.push(fn);return idle.length;};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/viewport-fit.js','utf8'),context);
 function flush(){let n=0;while(queue.size){assert(++n<30);const [i,fn]=queue.entries().next().value;queue.delete(i);fn();}}
 function fireTimers(){for(const [k,t] of [...timers]){timers.delete(k);t.fn();}}
 function runIdle(){const fns=idle.splice(0);fns.forEach(fn=>fn({didTimeout:false,timeRemaining:()=>10}));return fns.length;}
 return {screens,flush,fireTimers,runIdle,idle,timers,layouts,api:context.window.cncViewportFit,setActive(s){active=s;},get writes(){return writes}};
}
// Without requestIdleCallback nothing is scheduled.
let s=session({noIdle:true});s.flush();assert.equal(s.timers.size,0);assert.equal(s.layouts.length,0);
// With it: a 1.5 s delay after the first fit, then one screen per idle callback.
s=session();s.flush();
assert.equal(s.timers.size,1);assert.equal([...s.timers.values()][0].ms,1500);assert.equal(s.idle.length,0);
s.fireTimers();assert.equal(s.idle.length,1,'first idle callback requested');
assert.equal(s.runIdle(),1);assert.equal(s.layouts.length,1);
assert.deepEqual(s.layouts[0],{screen:'screen-files',display:'grid',visibility:'hidden',position:'absolute',width:'1248px'});
const files=s.screens[1];assert.equal(files.style.display,'');assert.equal(files.style.visibility,'');assert.equal(files.style.position,'');assert.equal(files.style.width,'');
// A screen made active or fitted meanwhile is skipped; the queue continues.
s.setActive(s.screens[2]);s.runIdle();assert.equal(s.layouts.length,1,'active screen not warmed');
s.runIdle();assert.equal(s.layouts.length,2);assert.equal(s.layouts[1].screen,'screen-jog');
s.runIdle();assert.equal(s.idle.length,0,'queue exhausted: no further idle callbacks');
// Disposal before the delay cancels the timer; disposal during the queue stops it.
s=session();s.flush();s.api.dispose();assert.equal(s.timers.size,0);
s=session();s.flush();s.fireTimers();s.api.dispose();s.runIdle();assert.equal(s.layouts.length,0);assert.equal(s.idle.length,0);
console.log('PASS viewport warm-up: idle-time hidden layout of unseen screens after the first fit, inline styles restored, active/fitted screens skipped, disposal stops it, nothing without requestIdleCallback.');
