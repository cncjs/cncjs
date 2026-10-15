const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const nodes={},listeners={};let network=0,dialogAtBody=false;
 const el=id=>nodes[id]||(nodes[id]={id,disabled:false,textContent:'',value:'',classList:{contains:()=>true},handlers:{},parentNode:{insertAdjacentHTML(){}},insertAdjacentHTML(){},removeAttribute(){},addEventListener(n,f){this.handlers[n]=f;},click(){if(!this.disabled&&this.handlers.click)this.handlers.click();},appendChild(){},insertBefore(){},setAttribute(){},focus(){}});
 const emit=(type,detail)=>(listeners[type]||[]).forEach(f=>f({type,detail}));
 const ctx={window:{addEventListener(n,f){(listeners[n]||(listeners[n]=[])).push(f);},dispatchEvent:e=>emit(e.type,e.detail)},document:{body:{getAttribute:()=> 'true',appendChild(n){dialogAtBody=n.id==='job-dialog';}},querySelector:()=>el('panel'),querySelectorAll:()=>[],getElementById:el,createElement:()=>el('option'),addEventListener(){},hidden:false},localStorage:{getItem:()=> '{}'},Promise,Date,CustomEvent:function(type,o){this.type=type;this.detail=o.detail;},setInterval(){},XMLHttpRequest:function(){network++;throw Error('Network forbidden');}};
 vm.createContext(ctx);
 for(const name of ['job-simulation','job-controls','job-dashboard'])vm.runInContext(fs.readFileSync(__dirname+'/touch/'+name+'.js','utf8'),ctx);
 const flush=()=>new Promise(setImmediate);await flush();assert(dialogAtBody);
 emit('cnc-library-select',{file:'leaf.nc',name:'leaf.nc'});el('job-load').click();await flush();
 assert(el('home-job-pause').disabled);assert(el('home-job-resume').disabled);
 el('job-start').click();await flush();el('job-check').checked=true;el('job-check').handlers.change.call(el('job-check'));el('job-confirm').click();await flush();
 assert(!el('home-job-pause').disabled);assert(!el('home-job-stop').disabled);
 el('home-job-pause').click();await flush();assert.match(el('job-state').textContent,/Hold/);assert(!el('home-job-resume').disabled);
 el('home-job-resume').click();await flush();assert.equal(el('job-dialog').hidden,false);assert.match(el('job-state').textContent,/Hold/);
 el('job-check').checked=true;el('job-check').handlers.change.call(el('job-check'));el('job-confirm').click();await flush();assert.match(el('job-state').textContent,/Run/);
 el('home-job-stop').click();await flush();assert.match(el('job-state').textContent,/Idle/);assert(el('home-job-stop').disabled);assert.match(el('home-job-feedback').textContent,/arrêté/);
 emit('cnc-job-status',{machine:null,simulation:true});assert(el('home-job-pause').disabled&&el('home-job-resume').disabled&&el('home-job-stop').disabled);
 assert.equal(network,0);console.log('PASS: home pause/resume confirmation/stop, visible modal, feedback, disabled/offline controls, zero machine calls.');
})().catch(e=>{console.error(e);process.exitCode=1});

