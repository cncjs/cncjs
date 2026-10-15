const fs=require('fs'),vm=require('vm'),assert=require('assert');
let now=10000;
const context={window:{},document:{querySelectorAll:()=>[]},Promise,Date:{now:()=>now}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/touch/job-simulation.js','utf8'),context);
const api=context.window.cncJobSimulation.request;
const get=async()=>(await api('GET')).controllers[0];
const post=(action,extra={})=>api('POST',{action,port:'SIMULATION',...extra});
(async()=>{
 assert.equal((await get()).canStart,false);
 await assert.rejects(api('POST',{action:'load',port:'/dev/ttyACM0',file:'leaf.nc'}));
 await post('load',{file:'leaf.nc'});assert.equal((await get()).canStart,true);
 let ticket=await post('prepare',{operation:'start',revision:(await get()).revision});
 await post('start',{nonce:ticket.nonce});now+=6000;assert.equal((await get()).received,10);
 await assert.rejects(post('start',{nonce:ticket.nonce}));
 await assert.rejects(post('load',{file:'other.nc'}));
 await post('pause');now+=9000;assert.equal((await get()).received,10);
 ticket=await post('prepare',{operation:'resume',revision:(await get()).revision});
 await post('resume',{nonce:ticket.nonce});now+=6000;assert.equal((await get()).received,20);
 await post('stop');assert.equal((await get()).canStart,false);
 await post('load',{file:'leaf.nc'});ticket=await post('prepare',{operation:'start',revision:(await get()).revision});
 now+=16000;await assert.rejects(post('start',{nonce:ticket.nonce}));
 ticket=await post('prepare',{operation:'start',revision:(await get()).revision});await post('start',{nonce:ticket.nonce});
 now+=60000;assert.equal((await get()).received,100);assert.equal((await get()).workflow,'idle');
 // Independent wall and elapsed clocks: an OS time correction must not alter durations.
 let wall=100000,elapsed=0;
 const timed={window:{performance:{now:()=>elapsed}},document:{querySelectorAll:()=>[]},Promise,Date:{now:()=>wall}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/job-simulation.js','utf8'),timed);
 const sim=timed.window.cncJobSimulation,request=(action,extra={})=>sim.request('POST',{port:'SIMULATION',action,...extra});
 const state=async()=>(await sim.request('GET')).controllers[0];
 const prepare=async(operation='start')=>request('prepare',{operation,revision:(await state()).revision});
 await request('load',{file:'clock.nc'});
 let first=await prepare(),second=await prepare();assert.notEqual(first.nonce,second.nonce,'Same-millisecond preparations need distinct tickets');
 await assert.rejects(request('start',{nonce:first.nonce}));
 let valid=await prepare();wall+=3600000;elapsed+=14999;await request('start',{nonce:valid.nonce});
 elapsed+=6000;wall-=7200000;assert.equal((await state()).received,10);
 assert.equal((await state()).history[0].time,3700000,'Journal keeps wall-clock dates');
 await request('pause');elapsed+=3600000;wall+=999999;assert.equal((await state()).received,10);
 valid=await prepare('resume');elapsed+=15000;wall-=3600000;await assert.rejects(request('resume',{nonce:valid.nonce}));
 valid=await prepare('resume');await request('resume',{nonce:valid.nonce});elapsed+=54000;
 assert.equal((await state()).received,100);assert.equal((await state()).workflow,'idle');
 // Accelerated long session: history stays bounded and each job starts with a new ticket.
 for(let n=0;n<200;n++){
   await request('load',{file:'session.nc'});valid=await prepare();await request('start',{nonce:valid.nonce});
   elapsed+=60000;assert.equal((await state()).received,100);
 }
 const final=await state();assert.equal(final.history.length,100);assert.equal(final.history[0].action,'complete');
 for(let n=0;n<20;n++)assert.equal((await state()).history[0].id,final.history[0].id,'Completion must be logged only once');
 assert(final.history.every((e,i,a)=>!i||e.id<a[i-1].id));
 // Without performance.now(), a backward jump must clamp progress and revoke a ticket.
 await post('load',{file:'fallback.nc'});ticket=await post('prepare',{operation:'start',revision:(await get()).revision});
 now-=1000;await assert.rejects(post('start',{nonce:ticket.nonce}));
 ticket=await post('prepare',{operation:'start',revision:(await get()).revision});await post('start',{nonce:ticket.nonce});
 now+=6000;assert.equal((await get()).received,10);now-=3600000;assert.equal((await get()).received,10);
 now+=6000;assert.equal((await get()).received,20);
 console.log('PASS: simulation load/start/pause/resume/stop/completion, tickets, real port rejection; no network API supplied.');
})().catch(e=>{console.error(e);process.exitCode=1});
