'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const {document,node,activeScreens,stats}=require('./dom-fixture.cjs').createDOM(['files']);
 const handlers={},requests=[];
 const ctx={document,window:{addEventListener:(n,f)=>handlers[n]=f,dispatchEvent(){}},CustomEvent:function(){},
  localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'fixture'}}})},XMLHttpRequest:function(){
   this.open=(method,url)=>this.url=url;this.setRequestHeader=()=>{};this.send=()=>requests.push(this);this.abort=()=>{};
  }};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/shared-library.js','utf8'),ctx);
 const flush=()=>new Promise(setImmediate),reply=async value=>{const r=requests.shift();r.status=200;r.responseText=JSON.stringify(value);r.onload();await flush();};
 const list=()=>node('library-list'),message=()=>list().children[0].textContent;
 assert.match(message(),/Chargement/);assert(!message().includes('vide'));
 requests.shift().onerror();await flush();assert.match(message(),/indisponible/);
 node('library-refresh').click();await reply({configured:true});await reply({files:[]});assert.match(message(),/vide/);
 const files=['a.nc','b.nc','c.nc','d.nc','e.nc'].map(name=>({name,type:'f',size:100,mtime:'2026-10-15'}));
 node('library-refresh').click();await reply({configured:true});await reply({files});
 await reply({data:JSON.stringify({version:1,file:'a.nc',originalName:'A',previewError:'fixture'})});
 const a=list().children[0],b=list().children[1];b.focus();
 const state=patch=>handlers['cnc-job-status']({detail:{machine:patch===null?null:Object.assign({port:'fixture',fresh:true,name:'b.nc',workflow:'idle',activeState:'Idle'},patch)}});
 state({});assert.equal(a._state.textContent,'✓ Sélectionné');assert.equal(b._state.textContent,'● Chargé');
 assert.strictEqual(document.activeElement,b);
 state({workflow:'running',activeState:'Run',received:100,total:100});assert.equal(b._state.textContent,'▶ En cours','100% is still running');
 const writes=stats.writes,count=requests.length;
 for(let i=0;i<20;i++)state({workflow:'running',activeState:'Run',statusAgeMs:i,received:i});
 assert.equal(stats.writes,writes,'progress/age updates must not rewrite file states');assert.equal(requests.length,count,'status does not fetch previews');
 b.click();assert.match(b._state.textContent,/Sélectionné.*En cours/);assert(a._state.hidden);
 await reply({data:JSON.stringify({version:1,file:'b.nc',originalName:'B',previewError:'fixture'})});
 state({workflow:'paused',activeState:'Hold'});assert.match(b._state.textContent,/En pause/);
 state({workflow:'paused',activeState:'Alarm'});assert.match(b._state.textContent,/Alarme/);
 state({fresh:false});assert.equal(b._state.textContent,'✓ Sélectionné');assert.match(node('library-selection-state').textContent,/indisponible/);
 state(null);assert.equal(b._state.textContent,'✓ Sélectionné');
 // Hidden state is retained without repaint; pagination derives current badges.
 activeScreens.clear();handlers['cnc-screen-change']({detail:'menu'});const hiddenWrites=stats.writes;
 state({name:'e.nc',workflow:'running',activeState:'Run'});assert.equal(stats.writes,hiddenWrites);
 activeScreens.add('files');handlers['cnc-screen-change']({detail:'files'});
 await reply({configured:true});await reply({files});
 node('library-more').click();assert.equal(list().children[0]._state.textContent,'▶ En cours');
 node('library-search').value='missing';node('library-search').handlers.input();assert.match(message(),/Aucun résultat/);
 console.log('PASS: loading/error/empty distinction, selection versus loaded/running, pause/alarm/stale states, 100% not completion, focus, zero status requests or repeated writes, hidden lifecycle and pagination.');
})().catch(e=>{console.error(e);process.exitCode=1;});
