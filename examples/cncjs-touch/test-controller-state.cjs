'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=10000,writes=0,timerId=0,emits=0;const pending=new Map(),ids={},created=[],socketHandlers={},windowHandlers={};
function node(tag){let content='';const selectors={},el={tag,className:'',hidden:false,children:[],handlers:{},value:'',appendChild(child){this.children.push(child);},querySelector(s){return selectors[s]||(selectors[s]=node(s));},addEventListener(n,f){this.handlers[n]=f;},removeEventListener(n,f){if(this.handlers[n]===f)delete this.handlers[n];}};Object.defineProperty(el,'textContent',{get(){return content;},set(v){writes++;content=v;}});created.push(el);return el;}
const main=node('main'),overview=node('overview'),socket={connected:true,on(n,f){(socketHandlers[n]||(socketHandlers[n]=[])).push(f);},off(n,f){socketHandlers[n]=(socketHandlers[n]||[]).filter(x=>x!==f);},emit(){emits++;throw Error('No controller subscription or command allowed');},disconnect(){this.connected=false;}};
const window={CNCJobStream:{},location:{pathname:'/touch/'},addEventListener(n,f){(windowHandlers[n]||(windowHandlers[n]=[])).push(f);},removeEventListener(n,f){windowHandlers[n]=(windowHandlers[n]||[]).filter(fn=>fn!==f);}};
const document={hidden:false,body:{getAttribute:()=>null},getElementById:id=>ids[id]||(ids[id]=node(id)),createElement:node,querySelector:s=>s==='main'?main:overview,querySelectorAll:()=>[]};
class Clock extends Date{static now(){return now;}}
const ctx={window,document,Date:Clock,location:{origin:'http://fixture.invalid'},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'fixture'}}})},io:{connect:()=>{throw Error('Compact mode must not open unused Socket.IO');}},setTimeout(fn){pending.set(++timerId,fn);return timerId;},clearTimeout(id){pending.delete(id);}};
vm.createContext(ctx);for(const name of ['cnc-state','app','machine-limits'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+name+'.js','utf8'),ctx);
const sample={port:'B',generation:'b1',type:'Grbl',fresh:true,activeState:'Idle',coordinates:{wpos:{x:1,y:2,z:3},mpos:{x:4,y:5,z:6}},settings:{'$110':5000,'$111':4000,'$112':800,'$20':1}};
window.cncState.set({machine:sample,transportConnected:true,transportReason:''});assert.equal(ids.wx.textContent,'1.000');assert.match(ids['st-ctrl'].textContent,/B/);assert.match(ids['limits-source'].textContent,/B/);assert.equal(emits,0);
const count=writes;now+=1000;window.cncState.set({machine:{...sample}});assert.equal(writes,count,'identical state must not write DOM');assert.equal(pending.size,0);
now+=1;window.cncState.set({machine:{...sample,coordinates:{...sample.coordinates,wpos:{x:10,y:2,z:3}}}});assert.equal(ids.wx.textContent,'10.000');
now+=10;window.cncState.set({machine:{...sample,activeState:'Alarm',coordinates:{...sample.coordinates,wpos:{x:20,y:2,z:3}}}});assert.match(ids['st-state'].textContent,/Alarm/);assert.equal(ids.wx.textContent,'10.000');assert.equal(pending.size,1);
now+=150;Array.from(pending.values()).forEach(fn=>fn());pending.clear();assert.equal(ids.wx.textContent,'20.000');
window.cncState.set({machine:{...sample,port:'A',generation:'a1',coordinates:{wpos:{x:30},mpos:{}},settings:{'$110':100}}});assert.match(ids['st-ctrl'].textContent,/A/);assert.match(ids['limits-source'].textContent,/A/);
window.cncState.set({machine:null,transportConnected:false,transportReason:'Connexion perdue'});assert.equal(ids.wx.textContent,'–');assert.match(ids['limits-source'].textContent,/indisponible/);assert.equal(pending.size,0);
window.cncState.set({machine:null,transportConnected:true,transportReason:''});assert.equal(ids['st-server'].textContent,'Serveur : suivi connecté');assert.match(ids['st-ctrl'].textContent,/aucun sélectionné/);assert.equal(ids.wx.textContent,'–');assert.match(ids['limits-source'].textContent,/indisponible/);
windowHandlers.pagehide.slice().forEach(fn=>fn({persisted:true}));
now+=1000;window.cncState.set({machine:sample,transportConnected:true});assert.equal(ids.wx.textContent,'1.000');assert.match(ids['limits-source'].textContent,/B/);
window.cncMachineLimits.dispose();window.cncConnection.dispose();assert.equal(Object.values(socketHandlers).flat().length,0);assert.equal(emits,0);
console.log('PASS: shared controller identity for DRO/limits, no socket list/open, unchanged DOM, 150 ms coordinate coalescing, immediate alarm, stale clearing and disposal.');
