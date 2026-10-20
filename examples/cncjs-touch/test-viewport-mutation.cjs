'use strict';
// A screen whose content changes several times a second (coordinates at 4 Hz)
// while it is measured must still be revealed: a content mutation never cancels
// a running measurement, only a viewport change or a screen activation does.
// Synthetic layout, no browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let id=0,height=1600;const queue=new Map(),handlers=new Map(),observers=[];
const screen={id:'screen-home',style:{},nodeType:1,hidden:false,getAttribute:()=>null};
screen.classList={contains:n=>n==='screen'||n==='active'};
Object.defineProperties(screen,{scrollWidth:{get:()=>parseFloat(screen.style.width)||1000},scrollHeight:{get:()=>height}});
const main={style:{},querySelector:()=>screen,querySelectorAll:()=>[screen],set scrollTop(v){},set scrollLeft(v){},clientWidth:1280};
screen.parentElement=main;
const context={requestAnimationFrame(fn){const n=++id;queue.set(n,fn);return n;},
  MutationObserver:function(fn){this.callback=fn;this.observe=()=>{};this.disconnect=()=>{};observers.push(this);},
  window:{innerWidth:1366,innerHeight:768,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n),cancelAnimationFrame:i=>queue.delete(i)},
  document:{querySelector:()=>main,getElementById:()=>null,body:{classList:{contains:n=>n==='ks-ui'}},documentElement:{style:{setProperty(){}}},addEventListener(){},removeEventListener(){}}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/viewport-fit.js','utf8'),context);
const fit=context.window.cncViewportFit,content=observers[0];
function frame(){const [i,fn]=queue.entries().next().value;queue.delete(i);fn();}
// Every animation frame, the coordinates of the active screen change.
function tick(){content.callback([{target:{nodeType:3,parentElement:screen}}]);}
function run(frames){for(let n=0;n<frames&&queue.size;n++){frame();tick();}}
handlers.get('cnc-screen-change')();
run(40);
assert.equal(screen.style.visibility,'','screen revealed although its content changes every frame');
assert.match(screen.style.transform||'',/^scale\(0\.\d+\)$/,'final scale applied');
const measured=fit.stats.measurements;
run(40);
assert.equal(fit.stats.measurements,measured,'content that still fits is never re-measured');
// A resize still cancels and restarts the measurement.
context.window.innerHeight=600;handlers.get('resize')();frame();
assert.equal(screen.style.visibility,'hidden','resize measures again');
context.window.innerHeight=700;handlers.get('resize')();
run(40);
assert.equal(screen.style.visibility,'');
const scale=Number(/scale\(([\d.]+)\)/.exec(screen.style.transform)[1]);
assert(Math.abs(scale-(700-32)/1600)<.01,'scale follows the last viewport, not the cancelled one: '+scale);
// Re-opening a screen whose content changed measures it again; an activation
// during that measurement cancels it and the screen still ends up revealed.
height=1500;handlers.get('cnc-screen-change')();frame();assert.equal(screen.style.visibility,'hidden');
height=1600;handlers.get('cnc-screen-change')();run(40);
assert.equal(screen.style.visibility,'');
assert(Math.abs(Number(/scale\(([\d.]+)\)/.exec(screen.style.transform)[1])-scale)<.01,'scale of the reopened content');
// Content that grows past the fitted size is shrunk without hiding the screen.
height=2400;tick();run(40);
assert.equal(screen.style.visibility,'');
assert(Number(/scale\(([\d.]+)\)/.exec(screen.style.transform)[1])<scale,'grown content shrunk');
console.log('PASS viewport mutation: live content never cancels a measurement, resize and activation still do.');
