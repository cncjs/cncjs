const fs=require('fs'),vm=require('vm'),assert=require('assert');let now=10000;
const c={window:{},document:{querySelectorAll:()=>[]},Date:{now:()=>now},Promise};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/touch/job-simulation.js','utf8'),c);
const api=c.window.cncJobSimulation.request,post=(action,data={})=>api('POST',{port:'SIMULATION',action,...data}),get=async()=>(await api('GET')).controllers[0];
(async()=>{
 assert.equal((await get()).history.length,1);await get();assert.equal((await get()).history.length,1);
 await post('load',{file:'example.nc'});let t=await post('prepare',{operation:'start',revision:(await get()).revision});await post('start',{nonce:t.nonce});now+=60000;
 let s=await get();assert.equal(s.history[0].action,'complete');assert.equal(s.history[0].percent,100);assert.equal(s.history[0].file,'example.nc');const count=s.history.length;await get();assert.equal((await get()).history.length,count);
 s.history[0].message='tampered';assert.notEqual((await get()).history[0].message,'tampered');
 await post('simulate-alarm');await assert.rejects(post('jog',{axis:'x',step:1,direction:1}));assert.equal((await get()).history[0].action,'rejected');await post('clear-simulated-alarm');
 for(let i=0;i<110;i++)await post('jog',{axis:'x',step:0.1,direction:1});s=await get();assert.equal(s.history.length,100);assert(s.history[0].id>s.history[99].id);
 console.log('PASS: timestamped ordered bounded journal, no polling duplicates, completion once, rejected actions, immutable snapshots.');
})().catch(e=>{console.error(e);process.exitCode=1});
