'use strict';
// Macros sheet: list from the job snapshot (names only), rows disabled unless the
// machine is idle and fresh, the sheet closes before the confirmation is prepared.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function fixture(){
 const dom=require('./dom-fixture.cjs').createDOM(['jog']),handlers={},prepared=[];let closed=0,opened=0;
 const content=dom.element('div'),actions=dom.element('div');
 const shell={sheet:(id,title)=>{assert.equal(id,'ks-macros');assert.equal(title,'Macros CNCjs');return {content,open:()=>opened++};},closeSheet:()=>closed++,preparationActions:actions};
 const window={cncShell:shell,addEventListener:(n,f)=>handlers[n]=f,cncJobControls:{prepareMacro:id=>prepared.push(id)}};
 dom.document.getElementById=id=>dom.node(id);
 const context={window,document:dom.document,JSON,Array,Object};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/macros.js','utf8'),context);
 const status=()=>dom.node('ks-macros-status').textContent,list=()=>dom.node('ks-macros-list');
 return {dom,handlers,prepared,actions,status,list,get closed(){return closed;},get opened(){return opened;},
  send(machine){handlers['cnc-job-status']({detail:{machine}});}};
}
const f=fixture();
const open=f.actions.children[0];
assert.equal(open.tagName,'BUTTON');assert.equal(open.textContent,'Macros…');assert(open.disabled,'no machine: entry disabled');
assert.equal(f.status(),'État machine indisponible.');
f.send({fresh:true,canMacro:true,macros:[]});assert(open.disabled);assert.equal(f.status(),'Aucune macro définie dans CNCjs.');
const macros=[{id:'a',name:'Dégagement Z'},{id:'b',name:'Repos'},{id:'bad'},null];
f.send({fresh:true,canMacro:false,macroReason:'La machine doit être au repos (Idle), sans commande en attente.',macros});
assert(!open.disabled);assert.equal(f.list().children.length,2);assert(f.list().children.every(row=>row.disabled));
assert.match(f.status(),/au repos/);
f.send({fresh:true,canMacro:true,macros});
assert(f.list().children.every(row=>!row.disabled));assert.equal(f.status(),'Machine au repos : touchez une macro pour la confirmer.');
const before=f.dom.stats.writes;f.send({fresh:true,canMacro:true,macros});assert.equal(f.dom.stats.writes,before,'unchanged snapshot: no DOM writes');
open.click();assert.equal(f.opened,1);
f.list().children[1].click();assert.deepEqual(f.prepared,['b']);assert.equal(f.closed,1,'sheet closed before the confirmation dialog');
f.send({fresh:false,canMacro:true,macros});f.list().children[0].click();assert.deepEqual(f.prepared,['b'],'stale state: rows disabled');
f.send({fresh:true,canMacro:true,macros:[{id:'b',name:'Repos'}]});assert.equal(f.list().children.length,1);assert.equal(f.list().children[0].textContent,'Repos');
f.send(null);assert(open.disabled);assert.equal(f.status(),'État machine indisponible.');
for(const name of ['index.html','simulation.html']){
  const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');
  assert.equal((html.match(/src="macros\.js/g)||[]).length,1);assert(html.indexOf('touch-shell.js')<html.indexOf('macros.js'));assert(html.indexOf('job-controls.js')<html.indexOf('macros.js'));
}
console.log('PASS macros: snapshot-driven list, idle/fresh gating, sheet closed before confirmation, no redundant writes, script order.');
