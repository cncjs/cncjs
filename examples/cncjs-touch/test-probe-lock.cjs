const assert=require('assert').strict,fs=require('fs'),vm=require('vm'),path=require('path');
(async()=>{
 const listeners={},window={dispatchEvent:e=>{if(listeners[e.type])listeners[e.type]();}};
 const document={querySelectorAll:()=>[]};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'touch/job-simulation.js'),'utf8'),{window,document,Date,Promise,CustomEvent:function(type){this.type=type;}});
 const sim=window.cncJobSimulation,post=body=>sim.request('POST',{port:'SIMULATION',...body});
 sim.acquireProbe();assert.throws(()=>sim.acquireProbe(),/bloque/);
 let state=(await sim.request('GET')).controllers[0];assert.equal(state.canJog,false);assert.equal(state.canLoad,false);assert.equal(state.canStart,false);
 await assert.rejects(post({action:'jog',axis:'x',step:1,direction:1}));await assert.rejects(post({action:'zero',axis:'xyz'}));await assert.rejects(post({action:'load',file:'example.nc'}));
 let interrupted=false;listeners['cnc-probe-interrupt']=()=>{interrupted=true;sim.releaseProbe();};
 await post({action:'simulate-alarm'});assert(interrupted);assert.throws(()=>sim.acquireProbe());await post({action:'clear-simulated-alarm'});
 await post({action:'load',file:'example.nc'});state=(await sim.request('GET')).controllers[0];
 const ticket=await post({action:'prepare',operation:'start',revision:state.revision});assert.throws(()=>sim.acquireProbe());
 await post({action:'start',nonce:ticket.nonce});assert.throws(()=>sim.acquireProbe());await post({action:'stop'});
 sim.acquireProbe();sim.releaseProbe();state=(await sim.request('GET')).controllers[0];assert.equal(state.canJog,true);
 console.log('PASS: shared simulation lock blocks jog, zero, load/start and concurrent probe; alarm interrupts, no automatic restart.');
})().catch(e=>{console.error(e);process.exitCode=1;});
