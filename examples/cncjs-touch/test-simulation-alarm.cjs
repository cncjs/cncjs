const fs=require('fs'),vm=require('vm'),assert=require('assert');let now=10000;
const c={window:{},document:{querySelectorAll:()=>[]},Date:{now:()=>now},Promise};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/touch/job-simulation.js','utf8'),c);
const api=c.window.cncJobSimulation.request,post=(action,data={})=>api('POST',{port:'SIMULATION',action,...data}),get=async()=>(await api('GET')).controllers[0];
(async()=>{
 await post('load',{file:'test.nc'});let t=await post('prepare',{operation:'start',revision:(await get()).revision});await post('simulate-alarm');await assert.rejects(post('start',{nonce:t.nonce}));
 let s=await get();assert.equal(s.activeState,'Alarm');assert(!s.canLoad&&!s.canStart&&!s.canResume&&!s.canJog);
 await assert.rejects(post('load',{file:'other.nc'}));await assert.rejects(post('jog',{axis:'x',step:1,direction:1}));
 await post('clear-simulated-alarm');s=await get();assert.equal(s.workflow,'idle');assert(s.canStart);
 t=await post('prepare',{operation:'start',revision:s.revision});await post('start',{nonce:t.nonce});now+=6000;await post('simulate-alarm');s=await get();assert.equal(s.workflow,'paused');const p=s.received;
 now+=20000;s=await get();assert.equal(s.received,p);assert(s.canStop);await assert.rejects(post('prepare',{operation:'resume',revision:s.revision}));
 await post('clear-simulated-alarm');s=await get();assert.equal(s.workflow,'paused');assert(s.canResume);now+=10000;assert.equal((await get()).received,p);
 t=await post('prepare',{operation:'resume',revision:s.revision});await post('resume',{nonce:t.nonce});now+=6000;assert((await get()).received>p);
 await post('simulate-alarm');await post('stop');s=await get();assert.equal(s.workflow,'idle');assert.equal(s.activeState,'Alarm');await post('clear-simulated-alarm');assert(!(await get()).canStart);
 await assert.rejects(api('POST',{port:'/dev/ttyACM0',action:'clear-simulated-alarm'}));
 console.log('PASS: alarm blocks commands, freezes progress, invalidates tickets, explicit resume, stop preserves alarm, real port rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
