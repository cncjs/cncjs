'use strict';
// A fitted scale remembered from an earlier page load is applied visibly on the
// first opening of a screen; only when nothing is remembered does the first fit
// measure with the screen hidden. Synthetic layout, no browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function session(storage,content=1600){
 let wrote=false,writes=0,id=0;const queue=new Map(),handlers=new Map(),log=[];
 function style(){return new Proxy({},{set(o,k,v){wrote=true;writes++;log.push(k+'='+v);o[k]=v;return true;}});}
 function read(value){assert(!wrote,'Geometry read after a write in the same frame');return value;}
 const screen={id:'screen-files',style:style(),nodeType:1,hidden:false};
 screen.classList={contains:n=>n==='screen'||n==='active'};
 Object.defineProperties(screen,{scrollWidth:{get:()=>read(parseFloat(screen.style.width)||1000)},scrollHeight:{get:()=>read(content*Math.min(1,1000/(parseFloat(screen.style.width)||1000)))}});
 const main={style:style(),querySelector:()=>screen,set scrollTop(v){wrote=true;},set scrollLeft(v){wrote=true;},get clientWidth(){return read(1280);}};
 screen.parentElement=main;
 const context={requestAnimationFrame(fn){const n=++id;queue.set(n,fn);return n;},
  MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{};},
  localStorage:storage,
  window:{innerWidth:1366,innerHeight:768,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n),cancelAnimationFrame:i=>queue.delete(i)},
  document:{querySelector:()=>main,getElementById:()=>null,body:{classList:{contains:n=>n==='ks-ui'}},documentElement:{style:{setProperty(){wrote=true;}}},addEventListener(){},removeEventListener(){}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/viewport-fit.js','utf8'),context);
 function flush(){let count=0;while(queue.size){assert(++count<30,'Fit did not settle');const [i,fn]=queue.entries().next().value;queue.delete(i);wrote=false;fn();}return count;}
 return {screen,flush,log,handlers,get writes(){return writes},stats:context.window.cncViewportFit.stats,storage};
}
function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),dump:()=>Object.fromEntries(m)};}
// First page load: nothing remembered, so the first fit hides the screen and then stores its scale.
const store=memory();let s=session(store);s.flush();
assert.equal(s.stats.hidden,1);assert(s.log.includes('visibility=hidden'));
const saved=JSON.parse(store.getItem('cncjs-touch-fit-v2'));assert(saved['screen-files'].scale<1);assert.match(saved['screen-files'].key,/^1366:768:/);
const firstScale=saved['screen-files'].scale;
// Second page load, same display: the remembered scale is applied visibly, verified next frame, nothing hidden.
s=session(store);const frames=s.flush();
assert.equal(s.stats.hidden,0,'remembered scale: no hidden measurement');assert.equal(s.stats.measurements,0);
assert(!s.log.includes('visibility=hidden'));assert(frames>=2,'apply, then verify in a later frame');
assert.equal(s.screen.style.transform,'scale('+firstScale+')');
// Content that still fits at the remembered scale needs no measurement at all.
s=session(store,2400);s.flush();assert.equal(s.stats.measurements,0);assert.equal(s.stats.hidden,0);
// Content that overflows it: the remembered scale is applied, then shrunk in place without hiding.
s=session(store,4000);s.flush();
assert.equal(s.stats.hidden,0);assert.equal(s.stats.measurements,1);assert(Number(s.screen.style.transform.match(/scale\(([^)]+)\)/)[1])<firstScale);
assert.equal(JSON.parse(store.getItem('cncjs-touch-fit-v2'))['screen-files'].height>saved['screen-files'].height,true,'new size remembered');
// Content now smaller than remembered (an interface update): measured again from scale 1, once, hidden; the screen grows back.
const grown=memory();grown.setItem('cncjs-touch-fit-v2',JSON.stringify({'screen-files':{key:'1366:768:1248:736:false',width:1248,height:2400,scale:.3}}));
s=session(grown,1200);s.flush();assert.equal(s.stats.hidden,1,'smaller content: one hidden measurement');assert(Number(s.screen.style.transform.match(/scale\(([^)]+)\)/)[1])>.3,'grows back');
// A different display size ignores the memory and measures hidden again.
const wide=memory();wide.setItem('cncjs-touch-fit-v2',JSON.stringify({'screen-files':{key:'800:480:700:400:false',width:700,height:900,scale:.5}}));
s=session(wide);s.flush();assert.equal(s.stats.hidden,1,'mismatched key: hidden measurement');
// Corrupt or failing storage never breaks the fit.
s=session({getItem:()=>'{not json',setItem(){throw Error('full');}});s.flush();assert.equal(s.stats.hidden,1);assert.match(s.screen.style.transform,/^scale\(/);
s=session({getItem:()=>JSON.stringify({'screen-files':{key:'1366:768:1248:720:false',width:1,height:1,scale:7}}),setItem(){}});s.flush();assert.equal(s.stats.hidden,1,'invalid remembered scale is ignored');
console.log('PASS viewport recall: first load measures hidden and remembers; later loads apply the scale visibly, verify by reads, shrink in place; mismatched key, corrupt and failing storage fall back.');
