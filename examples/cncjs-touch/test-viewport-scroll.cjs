'use strict';
// A screen marked data-fit="scroll" (Réglages) is never shrunk: full size, no hidden
// measurement, nothing remembered, main scrolls, the position resets only on opening.
// Synthetic layout, no browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let id=0,scrollTop=0,observed=0;const queue=new Map(),handlers=new Map(),log=[],stored=new Map();
function style(){return new Proxy({},{set(o,k,v){log.push(k+'='+v);o[k]=v;return true;}});}
const attrs={'data-fit':'scroll'};
const screen={id:'screen-settings',style:style(),nodeType:1,hidden:false,scrollWidth:1300,scrollHeight:2400,getAttribute:k=>k in attrs?attrs[k]:null};
screen.classList={contains:n=>n==='screen'||n==='active'};
const main={style:style(),querySelector:()=>screen,querySelectorAll:()=>[screen],get scrollTop(){return scrollTop;},set scrollTop(v){scrollTop=v;},set scrollLeft(v){},clientWidth:1280};
const context={requestAnimationFrame(fn){const n=++id;queue.set(n,fn);return n;},
  MutationObserver:function(){this.observe=()=>{observed++;};this.disconnect=()=>{};},
  localStorage:{getItem:k=>stored.has(k)?stored.get(k):null,setItem:(k,v)=>stored.set(k,v)},
  window:{innerWidth:1366,innerHeight:768,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n),cancelAnimationFrame:i=>queue.delete(i)},
  document:{querySelector:()=>main,getElementById:()=>null,body:{classList:{contains:n=>n==='ks-ui'}},documentElement:{style:{setProperty(){}}},addEventListener(){},removeEventListener(){}}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/viewport-fit.js','utf8'),context);
function flush(){let count=0;while(queue.size){assert(++count<30,'Fit did not settle');const [i,fn]=queue.entries().next().value;queue.delete(i);fn();}return count;}
let ready=0;context.window.cncViewportFit.whenReady(()=>ready++);
handlers.get('cnc-screen-change')();flush();
assert.equal(main.style.overflowY,'auto','main scrolls');
assert.equal(screen.style.transform,'none','never scaled');
assert(!log.some(l=>/^transform=scale/.test(l)),'no scale written');
assert(!log.includes('visibility=hidden'),'never hidden for a measurement');
assert.equal(context.window.cncViewportFit.stats.measurements,0);
assert.equal(stored.get('cncjs-touch-fit-v1'),undefined,'no scale remembered');
assert.equal(observed,0,'content changes are not observed');
assert.equal(ready,1,'ready callbacks still run');
// Reading position: kept on later refits, reset when the screen is opened again.
scrollTop=640;handlers.get('resize')();flush();assert.equal(scrollTop,640);
handlers.get('cnc-screen-change')();flush();assert.equal(scrollTop,0);
// Another screen goes back to the fitted, non-scrolling layout.
attrs['data-fit']=null;handlers.get('cnc-screen-change')();flush();
assert.equal(main.style.overflowY,'','main stops scrolling');assert(log.some(l=>/^transform=scale/.test(l)),'fitted again');
for(const name of ['index.html','simulation.html']){
  const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');
  assert(/settings-list\.css\?v=/.test(html),'the settings stylesheet is linked in '+name);
}
console.log('PASS viewport scroll: Réglages scrolls at full size, no hidden measurement, position kept until reopened, others still fitted.');
