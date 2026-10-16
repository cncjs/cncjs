'use strict';
// Réglages → Système: tabs, polling only while the tab is visible, per-core rendering,
// failure back-off and no redundant DOM writes. Network is mocked; nothing reaches a server.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {document,node,element,activeScreens,stats}=require('./dom-fixture.cjs').createDOM(['menu']);
const createElement=document.createElement;document.createElement=tag=>Object.assign(createElement(tag),{style:{}});
const panel=node('screen-settings'),intro=element('div');intro.className='card wide ks-panel-intro';panel.appendChild(intro);
panel.querySelector=sel=>sel==='.ks-panel-intro'?intro:null;
let timers=[],requests=[],resizes=0,token='jwt';
const handlers={};
const window={addEventListener:(n,f)=>handlers[n]=f,dispatchEvent:e=>{if(e.type==='resize')resizes++;},cncState:{get:()=>({apiBase:'/api'})}};
function XHR(){this.headers={};requests.push(this);}
XHR.prototype.open=function(m,u,a){this.method=m;this.url=u;this.async=a;};
XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
XHR.prototype.send=function(){this.sent=true;};
XHR.prototype.abort=function(){this.aborted=true;};
const context={window,document,XMLHttpRequest:XHR,
 Event:function(type){this.type=type;},
 localStorage:{getItem:()=>token?JSON.stringify({state:{session:{token}}}):null},
 setTimeout:(f,ms)=>{const id=timers.length+1;timers.push({f,ms,id,live:true});return id;},
 clearTimeout:id=>{const t=timers.find(x=>x.id===id);if(t)t.live=false;}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/system-monitor.js','utf8'),context);
const api=window.cncSystemMonitor;
const live=()=>timers.filter(t=>t.live);
const fire=()=>{const t=live()[0];assert(t,'a timer is pending');t.live=false;t.f();};
const answer=(status,data)=>{const r=requests.at(-1);r.status=status;r.responseText=typeof data==='string'?data:JSON.stringify(data);r.onload();};
const tabs=panel.children[1],[tabDisplay,tabSystem]=tabs.children,section=panel.children.at(-1);
const text=n=>n.textContent;
const all=n=>[n,...n.querySelectorAll('*')];
const byClass=cls=>all(section).filter(n=>(' '+(n.className||'')+' ').includes(' '+cls+' '));
const status=()=>text(byClass('ks-system-status')[0]);

assert.equal(tabs.className,'ks-settings-tabs');assert.equal(section.id,'ks-system');
assert.equal(panel.getAttribute('data-settings-tab'),'display');assert.equal(tabDisplay.getAttribute('aria-selected'),'true');
// Display tab, or system tab on a screen that is not shown: no request at all.
tabSystem.click();assert.equal(panel.getAttribute('data-settings-tab'),'system');assert.equal(requests.length,0,'settings screen not active');
assert(resizes>=2,'tab changes ask viewport-fit to refit');
activeScreens.clear();activeScreens.add('settings');handlers['cnc-screen-change']();
assert.equal(requests.length,1);const first=requests[0];
assert.equal(first.method,'GET');assert.equal(first.url,'/api/touch-system');assert.equal(first.headers.Authorization,'Bearer jwt');assert.equal(first.timeout,5000);
handlers['cnc-screen-change']();assert.equal(requests.length,1,'no overlapping request');

const sample={hostname:'surface',platform:'linux',arch:'arm',model:'ARMv7 Processor rev 9 (v7l)',cores:[12.4,95,71,0],cpu:44.6,load:[1.2,0.8,0.5],
 memory:{total:2058469376,available:1741586432,used:316882944},temperatures:[{name:'tsensor0-thermal',celsius:41.9},{name:'cpu-thermal',celsius:36.8}],
 power:{battery:{capacity:18,status:'Charging'},external:true},uptime:93784,server:{rss:73400320,heapUsed:1,uptime:3600}};
answer(200,sample);
const cores=byClass('ks-core');assert.equal(cores.length,4);
assert.deepEqual(cores.map(r=>text(r.children[0])),['Cœur 1','Cœur 2','Cœur 3','Cœur 4']);
assert.deepEqual(cores.map(r=>text(r.children[2])),['12 %','95 %','71 %','0 %']);
assert.deepEqual(cores.map(r=>r.children[1].getAttribute('data-level')),['ok','high','warm','ok']);
assert.equal(cores[1].children[1].children[0].style.transform,'scaleX(0.950)');
const big=byClass('ks-system-big').map(text);
assert.equal(big[0],'45 %');assert.match(big[1],/36[,.]8 °C/,'the cpu sensor is the headline temperature');assert.equal(big[2],'15 %');assert.equal(big[4],'18 %');assert.match(big[5],/70 Mo/);
const notes=byClass('ks-system-note').map(text);
assert.match(notes[0],/ARMv7.* · 4 cœurs/);assert.match(notes[1],/tsensor0 41[,.]9 °C · cpu 36[,.]8 °C/);assert.match(notes[2],/302 Mo \/ 1[,.]9 Go/);
assert.match(notes[4],/en charge · secteur branché/);assert.match(notes[5],/1 h 0 min.*1 j 2 h/);
assert.equal(text(byClass('ks-system-host')[0]),'surface · linux · arm');
// Next poll 2 s later; an identical sample writes nothing.
assert.equal(live().length,1);assert.equal(live()[0].ms,2000);
fire();assert.equal(requests.length,2);const before=stats.writes;answer(200,sample);assert.equal(stats.writes,before,'unchanged figures: no DOM writes');
// Fewer cores (another server) shrinks the list.
fire();answer(200,{...sample,cores:[50,50]});assert.equal(byClass('ks-core').length,2);
// Leaving the tab aborts the request in flight and stops the timer.
fire();const inflight=requests.at(-1);tabDisplay.click();assert(inflight.aborted);assert.equal(live().length,0);assert.equal(api.state().polling,false);
// A hidden page stops polling; visible again resumes at once.
tabSystem.click();const n=requests.length;answer(200,sample);document.hidden=true;handlers['cnc-screen-change']();assert.equal(live().length,0);
document.hidden=false;document.handlers.visibilitychange();assert.equal(requests.length,n+1);
// Failures: message, stale styling, exponential back-off capped at 30 s, recovery.
answer(503,{message:'Suivi indisponible.'});assert.equal(status(),'Suivi indisponible.');assert.equal(section.getAttribute('data-stale'),'true');assert.equal(live()[0].ms,4000);
fire();answer(401,{});assert.match(status(),/Session CNCjs requise/);assert.equal(live()[0].ms,8000);
fire();requests.at(-1).onerror();assert.match(status(),/injoignable/);assert.equal(live()[0].ms,16000);
fire();answer(200,'not json');assert.equal(live()[0].ms,30000);
fire();answer(200,sample);assert.equal(status(),'');assert.equal(section.getAttribute('data-stale'),'false');assert.equal(live()[0].ms,2000);
// Without a session token nothing is sent.
token='';const m=requests.length;fire();assert.equal(requests.length,m);assert.match(status(),/Session CNCjs requise/);token='jwt';
// Missing or malformed fields render as dashes, never NaN.
fire();answer(200,{cores:[null,'x'],memory:{},load:[],temperatures:[{name:'a',celsius:NaN}],power:{},server:{}});
assert(!all(section).some(x=>/NaN|undefined|Infinity/.test(x.textContent||'')),'no NaN/undefined in the panel');
assert.deepEqual(byClass('ks-core').map(r=>text(r.children[2])),['—','—']);
// Disposal on page unload.
handlers.pagehide({persisted:false});assert.equal(live().length,0);
for(const name of ['index.html','simulation.html']){
  const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');
  assert.equal((html.match(/src="system-monitor\.js/g)||[]).length,1);
  assert(html.indexOf('display-settings.js')<html.indexOf('system-monitor.js'),'the settings cards exist before the tabs are added');
}
console.log('PASS system monitor: tabs, visible-only polling, per-core bars, no redundant writes, back-off, malformed data, script order.');
