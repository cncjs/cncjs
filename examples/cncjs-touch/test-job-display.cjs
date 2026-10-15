const fs=require('fs'), vm=require('vm'), assert=require('assert');
const elements={}, listeners={};
function el(id){return elements[id]||(elements[id]={value:'',textContent:'',addEventListener(){},appendChild(){},insertBefore(){},setAttribute(){},focus(){}});}
const document={body:{appendChild(){},getAttribute(){return null;}},querySelector:()=>el('panel'),getElementById:el,createElement:()=>el('option'),addEventListener(){},hidden:false};
let response={controllers:[{port:'TEST',type:'Grbl',activeState:'Alarm',workflow:'idle',fresh:true,name:'',canLoad:false,canStart:false,loadReason:'Idle requis',startReason:'Fichier changé'}]};
const pending=[];
function XHR(){this.open=()=>{};this.setRequestHeader=()=>{};this.send=()=>pending.push(()=>{this.status=200;this.responseText=JSON.stringify(response);this.onload();});}
const timers=[];
let now=10000;class Clock extends Date{static now(){return now;}}
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/job-controls.js','utf8'),{document,window:{cncLibrarySelection:{name:'Feuille.nc',file:'leaf.nc'},addEventListener:(n,fn)=>listeners[n]=fn,dispatchEvent(){}},CustomEvent:function(type,options){this.type=type;this.detail=options.detail;},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'test'}}})},XMLHttpRequest:XHR,Promise,Date:Clock,setInterval:fn=>timers.push(fn)});
(async()=>{
 pending.shift()();await new Promise(setImmediate);
 assert.match(el('job-selected').textContent,/Feuille.nc/); // Selection arrived before this script was loaded.
 assert.match(el('job-reason').textContent,/ALARM/);assert.match(el('file').textContent,/Feuille.nc/);assert.match(el('file').textContent,/Aucun fichier chargé dans CNCjs/);assert.equal(el('job-start').disabled,true);
 response.controllers[0]={...response.controllers[0],activeState:'Idle',name:'leaf.nc',originalName:'Feuille.nc',canLoad:true,canStart:true};
 now+=10000;timers[0]();pending.shift()();await new Promise(setImmediate);
 assert.match(el('file').textContent,/Chargé dans CNCjs : Feuille.nc/);assert.equal(el('job-start').disabled,false);
 response.controllers=[];now+=10000;timers[0]();pending.shift()();await new Promise(setImmediate);
 assert.match(el('file').textContent,/état indisponible/);assert.equal(el('job-start').disabled,true);
 console.log('PASS: alarme, sélection distincte du chargement, accueil synchronisé et déconnexion.');
})().catch(e=>{console.error(e);process.exitCode=1});

