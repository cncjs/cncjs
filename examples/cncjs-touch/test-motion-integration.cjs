'use strict';
const assert = require('assert').strict;
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { createService } = require('./job-service');
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cnc-motion-test-'));
  try {
    await fs.writeFile(path.join(root, 'test.nc'), 'G21\nG1 X1 F200');
    let now = 10000, commands = [], completeLoad;
    const c = { type:'Grbl', options:{port:'TEST'}, ready:true, isClose:()=>false,
      runner:new EventEmitter(), sender:new EventEmitter(), workflow:{state:'idle'},
      state:{status:{activeState:'Idle'}}, feeder:{toJSON:()=>({queue:0,pending:false})},
      settings:{settings:{$110:1000,$111:1000,$112:200}} };
    c.runner.state=c.state;
    c.sender.state={name:'',context:{},total:0};c.sender.toJSON=()=>({...c.sender.state});
    c.command=(name,file,gcode,context,done)=>{
      commands.push(name);assert.equal(name,'gcode:load');
      completeLoad=()=>{c.sender.state={name:file,context,total:2};c.sender.emit('load');done(null);};
    };
    const service=createService({get:()=>({TEST:c})},{get:key=>key==='watchDirectory'?root:[]},()=>now);
    const body={port:'TEST',axis:'X',direction:1,step:1,feed:800};
    assert.equal(service.list()[0].canPreviewMotion,false);
    assert.equal(service.list()[0].probeInput.state,'unknown');
    c.runner.emit('status',{raw:'<Idle|MPos:0,0,0|Pn:P>'});
    assert.equal(service.list()[0].probeInput.state,'contact');
    assert.equal(service.list()[0].probeInput.canProbe,false);
    c.runner.emit('status');assert.equal(service.list()[0].canPreviewMotion,true);
    assert.equal(service.previewMotion(body).dryRun,true);assert.equal(commands.length,0);
    assert.throws(()=>service.previewMotion({...body,axis:'Z'}),e=>e.code==='FEED');
    const loading=service.action({port:'TEST',action:'load',file:'test.nc'});
    assert.equal(service.list()[0].canPreviewMotion,false);
    assert.throws(()=>service.previewMotion(body),e=>e.code==='SESSION');
    while(!completeLoad) await new Promise(resolve=>setTimeout(resolve,5));
    completeLoad();await loading;
    const state=service.list()[0];assert.equal(state.canPreviewMotion,true);
    service.openTransport('offline-transport');
    await service.action({port:'TEST',generation:state.generation,transportId:'offline-transport',action:'prepare',operation:'start',revision:state.revision});
    assert.equal(service.list()[0].canPreviewMotion,false);
    assert.throws(()=>service.previewMotion(body),e=>e.code==='SESSION');
    now+=15001;c.runner.emit('status');assert.equal(service.list()[0].canPreviewMotion,true);
    assert.equal(service.previewMotion(body).dryRun,true);
    assert.deepEqual(commands,['gcode:load']); // No start, jog or raw G-code ever sent.
    c.state.status.activeState='Alarm';
    assert.equal(service.list()[0].canPreviewMotion,false);
    assert.throws(()=>service.previewMotion(body),e=>e.code==='BUSY');
    console.log('PASS: motion/job integration, pending load and confirmation, expiry, axis limits; fake controller only.');
  } finally { await fs.unlink(path.join(root,'test.nc')); await fs.rmdir(root); }
})().catch(error=>{console.error(error);process.exitCode=1;});
