const fs=require('fs'),vm=require('vm'),assert=require('assert');
const c={window:{},document:{querySelectorAll:()=>[]},Date,Promise};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/touch/job-simulation.js','utf8'),c);
const api=c.window.cncJobSimulation.request,post=(action,data={})=>api('POST',{port:'SIMULATION',action,...data}),get=async()=>(await api('GET')).controllers[0];
(async()=>{
 await post('jog',{axis:'x',step:10,direction:1});await post('jog',{axis:'z',step:0.1,direction:-1});let s=await get();assert.equal(s.machinePosition.x,10);assert.equal(s.workPosition.z,-0.1);
 await post('zero',{axis:'x'});s=await get();assert.equal(s.machinePosition.x,10);assert.equal(s.workPosition.x,0);assert.equal(s.workPosition.z,-0.1);
 await post('jog',{axis:'x',step:1,direction:-1});s=await get();assert.equal(s.machinePosition.x,9);assert.equal(s.workPosition.x,-1);
 await post('zero',{axis:'xyz'});s=await get();assert.equal(s.workPosition.z,0);assert.equal(s.machinePosition.z,-0.1);
 await assert.rejects(post('jog',{axis:'a',step:1,direction:1}));await assert.rejects(post('jog',{axis:'x',step:100,direction:1}));await assert.rejects(post('zero',{axis:'all'}));
 await post('load',{file:'test.nc'});let ticket=await post('prepare',{operation:'start',revision:(await get()).revision});await post('zero',{axis:'xyz'});await assert.rejects(post('start',{nonce:ticket.nonce}));
 ticket=await post('prepare',{operation:'start',revision:(await get()).revision});await post('start',{nonce:ticket.nonce});
 for(const action of ['jog','zero','reset-position'])await assert.rejects(post(action,{axis:'x',step:1,direction:1}));
 await post('pause');await assert.rejects(post('jog',{axis:'x',step:1,direction:1}));await post('stop');await post('reset-position');s=await get();assert.equal(s.machinePosition.x,0);assert.equal(s.workPosition.z,0);assert.equal(s.canJog,true);
 console.log('PASS: simulated axes, work offsets, validation, running/paused interlocks, confirmation invalidation, reset; no network facilities.');
})().catch(e=>{console.error(e);process.exitCode=1});
