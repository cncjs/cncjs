const fs=require('fs'),vm=require('vm'),assert=require('assert');
async function check(withSimulator) {
 const nodes={},listeners={};let requests=0;
 const el=id=>nodes[id]||(nodes[id]={value:'',textContent:'',handlers:{},addEventListener(n,f){this.handlers[n]=f;},appendChild(){},insertBefore(){},setAttribute(){},focus(){}});
 const document={body:{getAttribute:()=> 'true',appendChild(){}},querySelector:()=>el('panel'),querySelectorAll:()=>[],getElementById:el,createElement:()=>el('option'),addEventListener(){},hidden:false};
 const context={window:{addEventListener:(n,f)=>listeners[n]=f,dispatchEvent(e){if(listeners[e.type])listeners[e.type](e);}},document,CustomEvent:function(type,options){this.type=type;this.detail=options.detail;},Promise,Date,setInterval(){},XMLHttpRequest:function(){requests++;throw Error('Real network forbidden');}};
 vm.createContext(context);
 if(withSimulator)vm.runInContext(fs.readFileSync(__dirname+'/touch/job-simulation.js','utf8'),context);
 vm.runInContext(fs.readFileSync(__dirname+'/touch/job-controls.js','utf8'),context);
 await new Promise(setImmediate);
 if(withSimulator){
  listeners['cnc-library-select']({detail:{file:'leaf.nc',name:'leaf.nc'}});
  el('job-load').handlers.click();await new Promise(setImmediate);
  assert.match(el('file').textContent,/SIMULATION/);assert.match(el('file').textContent,/Chargé dans le simulateur/);
  el('job-start').handlers.click();await new Promise(setImmediate);
  el('job-check').checked=true;el('job-confirm').handlers.click();await new Promise(setImmediate);
  assert.match(el('job-state').textContent,/Run/);
  el('job-pause').handlers.click();await new Promise(setImmediate);assert.match(el('job-state').textContent,/Hold/);
  el('job-resume').handlers.click();await new Promise(setImmediate);el('job-check').checked=true;el('job-confirm').handlers.click();await new Promise(setImmediate);assert.match(el('job-state').textContent,/Run/);
  el('job-stop').handlers.click();await new Promise(setImmediate);assert.match(el('job-state').textContent,/Idle/);
 }else {assert.equal(el('job-start').disabled,true);assert.match(el('job-state').textContent,/Simulateur indisponible/);}
 assert.equal(requests,0);
}
(async()=>{await check(true);await check(false);console.log('PASS: UI simulation complete workflow, zero real API calls; missing simulator fails closed.');})().catch(e=>{console.error(e);process.exitCode=1});


