'use strict';
// Header clock: one write per minute on the minute, nothing while hidden or switched off.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {document,element,stats}=require('./dom-fixture.cjs').createDOM(['menu']);
const header=element('div'),badge=element('span');header.appendChild(badge);
const classes=new Set();document.body.classList={contains:n=>classes.has(n)};
document.querySelector=sel=>sel==='.ks-simulation'?badge:null;
let now=new Date(2026,9,16,18,41,30,250).getTime(),timers=[];
const handlers={};
class FakeDate extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
const context={document,Date:FakeDate,
 window:{addEventListener:(n,f)=>handlers[n]=f,cncI18n:{locale:'fr-FR'}},
 setTimeout:(f,ms)=>{const id=timers.length+1;timers.push({f,ms,id,live:true});return id;},
 clearTimeout:id=>{const t=timers.find(x=>x.id===id);if(t)t.live=false;}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/header-clock.js','utf8'),context);
const clock=header.children[0],live=()=>timers.filter(t=>t.live);
assert.equal(clock.tagName,'TIME');assert.equal(header.children[1],badge,'clock sits before the mode badge');
assert.equal(clock.textContent,'18:41');assert.equal(clock.getAttribute('datetime'),'18:41');
assert.equal(live().length,1);assert.equal(live()[0].ms,60000-30250+50,'next update just after the minute');
now+=29800;let t=live()[0];t.live=false;t.f();assert.equal(clock.textContent,'18:42');
// Same minute again: no write.
let writes=stats.writes;handlers['cnc-screen-change']();assert.equal(stats.writes,writes);assert.equal(live().length,1,'a single timer, never stacked');
// Switched off: the text is left alone, the timer only rechecks once a minute.
classes.add('display-hide-clock');now+=60000;t=live()[0];t.live=false;writes=stats.writes;t.f();assert.equal(stats.writes,writes);assert.equal(clock.textContent,'18:42');
classes.delete('display-hide-clock');context.window.cncHeaderClock.tick();assert.equal(clock.textContent,'18:43');
// Hidden page: no timer; visible again: immediate update.
document.hidden=true;document.handlers.visibilitychange();assert.equal(live().length,0);
now+=3*60000;document.hidden=false;document.handlers.visibilitychange();assert.equal(clock.textContent,'18:46');assert.equal(live().length,1);
handlers.pagehide({persisted:false});assert.equal(live().length,0);
for(const name of ['index.html','simulation.html']){
  const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');
  assert.equal((html.match(/src="header-clock\.js/g)||[]).length,1);assert(html.indexOf('touch-shell.js')<html.indexOf('header-clock.js'));
}
console.log('PASS header clock: minute-aligned updates, no redundant writes, off switch, hidden page, disposal.');
