'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function fixture(file){
 let writes=0;const nodes={},events={};
 const node=id=>nodes[id]||(nodes[id]=new Proxy({textContent:'',disabled:false,className:'',addEventListener(){},getAttribute(n){return n==='data-axis'?'x':'workPosition';}},{set(o,k,v){writes++;o[k]=v;return true;}}));
 const doc={hidden:false,getElementById:node,querySelectorAll(selector){if(selector==='[data-sim-step]')return [];return [node(selector)];},addEventListener(n,f){events[n]=f;}};
 const ctx={window:{addEventListener(n,f){events[n]=f;}},document:doc};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/'+file,'utf8'),ctx);
 return {events,node,doc,get writes(){return writes;}};
}
for(const [file,screen] of [['simulation-motion.js','jog'],['simulation-machine.js','machine']]){
 const f=fixture(file),machine={activeState:'Idle',workflow:'idle',canJog:true,workPosition:{x:1},name:''};
 const state=()=>f.events['cnc-job-status']({detail:{simulation:true,machine}});
 f.events['cnc-screen-change']({detail:'menu'});const before=f.writes;
 for(let i=0;i<10;i++)state();assert.equal(f.writes,before,'No hidden writes');
 f.events['cnc-screen-change']({detail:screen});assert(f.writes>before);
 const visible=f.writes;for(let i=0;i<10;i++)state();assert.equal(f.writes,visible,'No unchanged writes');
 f.doc.hidden=true;machine.activeState='Alarm';state();assert.equal(f.writes,visible);
 f.doc.hidden=false;f.events.visibilitychange();assert(f.writes>visible,'Refresh on visibility return');
}
{
 const events={},sources={mx:{textContent:'1.000'},wx:{textContent:'2.000'}},observers=[];let active='jog';
 const panel=name=>({classList:{contains:n=>n==='screen'||n==='active'&&active===name}});
 const copies=['jog','machine'].map(name=>({textContent:'',getAttribute:()=>name==='jog'?'wx':'mx',parentElement:panel(name)}));
 const doc={hidden:false,querySelectorAll:()=>copies,getElementById:id=>sources[id],addEventListener(n,f){events[n]=f;},removeEventListener(n){delete events[n];}};
 const ctx={document:doc,window:{addEventListener(n,f){events[n]=f;},removeEventListener(n){delete events[n];}},MutationObserver:function(fn){this.targets=[];this.observe=t=>this.targets.push(t);this.disconnect=()=>{this.targets=[];};this.callback=fn;observers.push(this);}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/coordinate-display.js','utf8'),ctx);
 assert.equal(copies[0].textContent,'2.000');assert.equal(copies[1].textContent,'');assert.equal(observers[0].targets.length,1);
 for(let i=0;i<10;i++){active=i%2?'jog':'machine';events['cnc-screen-change']();assert.equal(observers[0].targets.length,1);}
 active='menu';events['cnc-screen-change']();assert.equal(observers[0].targets.length,0);
 events.pagehide({persisted:false});assert.equal(Object.keys(events).length,0);
}
console.log('PASS hidden views: no hidden/identical writes, immediate re-entry, active-only coordinate observer and bounded subscriptions.');
