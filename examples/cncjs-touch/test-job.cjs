const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createService}=require('./job-service');
(async()=>{
 const root=await fs.mkdtemp(path.join(require('node:os').tmpdir(),'cnc-job-test-'));
 try {
 await fs.writeFile(path.join(root,'test.nc'),'G21 G90\nG1 X1 F100\nM2');
 let now=10000, commands=[], controllers={}, events=[];
 const c={type:'Grbl',options:{port:'TEST'},ready:true,isClose:()=>false,runner:new EventEmitter(),sender:new EventEmitter(),workflow:{state:'idle'},state:{status:{activeState:'Idle'}},feeder:{toJSON:()=>({queue:0,pending:false})}};
 c.runner.state=c.state;
 c.sender.state={name:'',context:{},total:0};c.sender.toJSON=()=>({...c.sender.state});
 c.command=(name,...args)=>{
  commands.push([name,...args]);
  if(name==='gcode:load'){c.sender.state={name:args[0],context:args[2],total:3};c.sender.emit('load');args[3](null);}
  if(name==='gcode:start'||name==='gcode:resume')c.workflow.state='running';
  if(name==='gcode:pause'){c.workflow.state='paused';c.state.status.activeState='Hold';}
  if(name==='gcode:stop'){c.workflow.state='idle';c.state.status.activeState='Idle';}
 };
 controllers.TEST=c;
 const service=createService({get:()=>controllers},{get:key=>key==='watchDirectory'?root:events},()=>now);
 const generation=service.list()[0].generation,transportId='offline-transport';service.openTransport(transportId);
 const req=(action,extra={})=>service.action({port:'TEST',generation,transportId,action,...extra});
 await assert.rejects(req('load',{file:'test.nc'}),/trop ancien/);
 c.runner.emit('status');c.state.status.activeState='Alarm';
 await assert.rejects(req('load',{file:'test.nc'}),/repos/);assert.equal(commands.length,0);
 c.state.status.activeState='Idle';await assert.rejects(req('load',{file:'../test.nc'}),/invalide/);
 await req('load',{file:'test.nc'});assert.equal(commands.length,1);assert.equal(commands[0][0],'gcode:load');
 let state=service.list()[0];assert.equal(state.canStart,true);
 for(const action of ['prepare','start','resume']) {
  await assert.rejects(service.action({port:'TEST',action,transportId}),/identité/);
  await assert.rejects(service.action({port:'TEST',action,generation}),/interrompue/);
  await assert.rejects(service.action({port:'TEST',action,generation,transportId:'closed-transport'}),/interrompue/);
 }
 let ticket=await req('prepare',{operation:'start',revision:state.revision});
 now+=16000;c.runner.emit('status');await assert.rejects(req('start',{nonce:ticket.nonce}),/expirée/);
 ticket=await req('prepare',{operation:'start',revision:state.revision});c.state.status.activeState='Alarm';
 await assert.rejects(req('start',{nonce:ticket.nonce}),/repos/);assert.equal(commands.length,1);
 c.state.status.activeState='Idle';ticket=await req('prepare',{operation:'start',revision:state.revision});
 await req('start',{nonce:ticket.nonce});assert.equal(commands.at(-1)[0],'gcode:start');
 await assert.rejects(req('start',{nonce:ticket.nonce}),/expirée/);
 await req('pause');state=service.list()[0];assert.equal(state.canResume,true);
 ticket=await req('prepare',{operation:'resume',revision:state.revision});await req('resume',{nonce:ticket.nonce});assert.equal(commands.at(-1)[0],'gcode:resume');
 await req('stop');assert.deepEqual(commands.at(-1),['gcode:stop',{force:true}]);
 await assert.rejects(req('prepare',{operation:'start',revision:state.revision}),/Rechargez/);
 await req('load',{file:'test.nc'});state=service.list()[0];ticket=await req('prepare',{operation:'start',revision:state.revision});
 c.sender.emit('load');await assert.rejects(req('start',{nonce:ticket.nonce}),/expirée/);
 await req('load',{file:'test.nc'});state=service.list()[0];now+=3000;
 await assert.rejects(req('prepare',{operation:'start',revision:state.revision}),/trop ancien/);
 c.runner.emit('status');events=[{enabled:true}];await assert.rejects(req('load',{file:'test.nc'}),/Automatismes/);
 events=[];await fs.writeFile(path.join(root,'macro.nc'),'%wait\nG1 X1');await assert.rejects(req('load',{file:'macro.nc'}),/directives/);
 controllers={};await assert.rejects(req('start',{nonce:'fake'}),/non connecté/);
 console.log('Job guard: all safety and command routing scenarios passed; fake controller only.');
 } finally {
  for(const name of ['test.nc','macro.nc']) await fs.unlink(path.join(root,name)).catch(e=>{if(e.code!=='ENOENT')throw e;});
  await fs.rmdir(root);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
