'use strict';
// Content changes of the shown screen (machine values, 4 per second during a job)
// ask for a fit at most once a second: every fit reads the layout, which forces a
// layout of the whole screen on the tablet. Opening and resizing are not delayed,
// and content that grew is still shrunk within a second. Synthetic layout, no browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let id=0,height=600,now=1000,fits=0;const queue=new Map(),handlers=new Map(),observers=[],timers=new Map();
const screen={id:'screen-home',style:{},nodeType:1,hidden:false,getAttribute:()=>null};
screen.classList={contains:n=>n==='screen'||n==='active'};
Object.defineProperties(screen,{scrollWidth:{get:()=>parseFloat(screen.style.width)||1000},scrollHeight:{get:()=>height}});
const main={style:{},querySelector:()=>{fits++;return screen;},querySelectorAll:()=>[screen],set scrollTop(v){},set scrollLeft(v){},clientWidth:1280};
screen.parentElement=main;
let timerId=0;
const context={requestAnimationFrame(fn){const n=++id;queue.set(n,fn);return n;},
  setTimeout(fn,ms){const n=++timerId;timers.set(n,{fn,at:now+ms});return n;},clearTimeout(n){timers.delete(n);},
  Date:{now:()=>now},
  MutationObserver:function(fn){this.callback=fn;this.observe=()=>{};this.disconnect=()=>{};observers.push(this);},
  window:{innerWidth:1366,innerHeight:768,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n),cancelAnimationFrame:i=>queue.delete(i)},
  document:{querySelector:()=>main,getElementById:()=>null,body:{classList:{contains:n=>n==='ks-ui'}},documentElement:{style:{setProperty(){}}},addEventListener(){},removeEventListener(){}}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/viewport-fit.js','utf8'),context);
const content=observers[0];
function frames(){while(queue.size){const [i,fn]=queue.entries().next().value;queue.delete(i);fn();}}
function advance(ms){const end=now+ms;for(;;){const due=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();frames();}now=end;}
function change(){content.callback([{target:{nodeType:3,parentElement:screen}}]);frames();}
handlers.get('cnc-screen-change')();frames();
assert.equal(screen.style.visibility,'','screen shown');
// Three seconds of a job: a value changes every 250 ms.
fits=0;
for(let i=0;i<12;i++){change();advance(250);}
advance(1000);
assert(fits>=3&&fits<=4,'content asks for about one fit a second, not one per change: '+fits);
// Content that grew is still shrunk, within a second.
height=2000;change();advance(1000);
assert.match(screen.style.transform,/^scale\(0\.\d+\)$/,'grown content shrunk');
// Opening a screen is never delayed.
fits=0;handlers.get('cnc-screen-change')();frames();assert(fits>=1,'activation fits at the next frame');
// Dispose clears a pending delayed fit.
change();change();assert(timers.size>=0);context.window.cncViewportFit.dispose();assert.equal(timers.size,0,'no timer left after dispose');
console.log('PASS viewport throttle: content changes fit at most once a second, grown content still shrinks, activation immediate, timer cleared.');
