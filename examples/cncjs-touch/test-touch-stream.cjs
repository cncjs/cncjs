'use strict';
const assert=require('node:assert/strict'), {EventEmitter}=require('node:events'), fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {createService}=require('./job-service'), {installRoutes}=require('./touch-stream'), {patch}=require('./install-custom.cjs');
function timers(){let id=0;const intervals=new Map(),timeouts=new Map();return {intervals,timeouts,setInterval(fn){intervals.set(++id,fn);return id;},clearInterval(id){intervals.delete(id);},setTimeout(fn){timeouts.set(++id,fn);return id;},clearTimeout(id){timeouts.delete(id);},flush(){const tasks=Array.from(timeouts.values());timeouts.clear();tasks.forEach(fn=>fn());}};}
function response(){const res=new EventEmitter();Object.assign(res,{statusCode:200,lines:[],headers:{},ended:false,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},send(data){this.data=data;return this;},write(line){this.lines.push(JSON.parse(line));return true;},flush(){},flushHeaders(){},end(){this.ended=true;}});return res;}
(async()=>{
  let now=10000, registry={}, commands=[];
  function fake(){const c={type:'Grbl',options:{port:'A'},ready:true,isClose:()=>false,runner:new EventEmitter(),sender:new EventEmitter(),workflow:{state:'idle'},state:{status:{activeState:'Idle',wpos:{x:1,y:2,z:3},mpos:{x:4,y:5,z:6}}},settings:{settings:{'$110':'5000','$20':'1',secret:'must-not-copy'}},feeder:{toJSON:()=>({queue:0,pending:false})}};
    c.runner.state=JSON.parse(JSON.stringify(c.state));
    c.sender.state={name:'',context:{},total:0,gcode:'DO NOT SEND GCODE'};c.sender.toJSON=()=>c.sender.state;
    c.command=(name,...args)=>{commands.push(name);if(name==='gcode:load'){c.sender.state={name:args[0],context:args[2],total:1,gcode:args[1]};c.sender.emit('load');args[3](null);}};return c;}
  registry.A=fake();const first=registry.A;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'touch-stream-'));fs.writeFileSync(path.join(dir,'test.nc'),'G1 X1');
  const service=createService({get:()=>registry},{get:key=>key==='watchDirectory'?dir:[]},()=>now), scheduled=timers(), routes=new Map();
  const app={get(p,...handlers){routes.set('GET '+p,handlers);},post(p,...handlers){routes.set('POST '+p,handlers);}};
  const installed=installRoutes(app,service,{apiBase:'/cnc/api',clock:()=>now,timers:scheduled});
  function call(method,url,user=true,body){const req=new EventEmitter(),res=response();req.body=body;if(user)req.user={id:'offline-test'};const handlers=routes.get(method+' '+url);assert(handlers);let i=0;function next(){const handler=handlers[i++];if(handler)handler(req,res,next);}next();return {req,res};}
  try {
    for(const route of ['/touch-job','/touch-events','/custom/health']){const r=call('GET','/cnc/api'+route,false).res;assert.equal(r.statusCode,401);assert.equal(r.lines.length,0);}
    assert.equal(call('POST','/cnc/api/touch-job',false,{port:'A',action:'stop'}).res.statusCode,401);assert.deepEqual(commands,[]);
    const health=call('GET','/cnc/api/custom/health').res.data;assert.equal(health.loaded,true);assert.equal(health.protocol,1);
    const connection=call('GET','/cnc/api/touch-events'), stream=connection.res;
    assert.equal(stream.lines[0].controllers[0].fresh,false);
    first.runner.emit('status',{raw:'<Idle|MPos:4,5,6|Pn:X>'});scheduled.flush();
    const packet=stream.lines.at(-1), machine=packet.controllers[0];
    assert.equal(machine.fresh,true);assert.equal(machine.statusAgeMs,0);assert.equal(machine.controllerId,'A');assert(machine.generation);
    assert.equal(machine.coordinates.wpos.x,1);assert.equal(machine.settings.$110,'5000');
    assert.equal(machine.probeInput.state,'free');assert(!JSON.stringify(packet).includes('DO NOT SEND GCODE'));assert(!JSON.stringify(packet).includes('must-not-copy'));
    now+=2600;installed.publish();assert.equal(stream.lines.at(-1).controllers[0].fresh,false);assert.equal(stream.lines.at(-1).controllers[0].probeInput.fresh,false);
    first.runner.emit('status',{raw:'<Idle|MPos:4,5,6|Pn:P>'});scheduled.flush();
    const transportId=stream.lines.at(-1).transportId;
    await service.action({port:'A',generation:machine.generation,transportId,action:'load',file:'test.nc'});
    const loaded=service.list()[0];
    for(const rawState of ['Alarm','Run']) {
      first.runner.state.status={activeState:rawState,wpos:{x:99,y:98,z:97},mpos:{x:96,y:95,z:94}};
      first.runner.emit('status',{raw:'<'+rawState+'|MPos:96,95,94>'});scheduled.flush();
      const raw=stream.lines.at(-1).controllers[0];
      assert.equal(first.state.status.activeState,'Idle');assert.equal(raw.activeState,rawState);assert.equal(raw.coordinates.wpos.x,99);assert.equal(raw.statusAgeMs,0);
      assert.equal(raw.canLoad,false);assert.equal(raw.canStart,false);assert.equal(raw.canPreviewMotion,false);
      await assert.rejects(service.action({port:'A',generation:machine.generation,transportId,action:'prepare',operation:'start',revision:loaded.revision}),/repos/);
    }
    first.runner.state.status={activeState:'Idle'};first.runner.emit('status');
    const ticket=await service.action({port:'A',generation:machine.generation,transportId,action:'prepare',operation:'start',revision:loaded.revision});
    connection.res.emit('close');assert(stream.ended);
    await assert.rejects(service.action({port:'A',generation:machine.generation,transportId,action:'start',nonce:ticket.nonce}),/interrompue/);assert.deepEqual(commands,['gcode:load']);
    const second=call('GET','/cnc/api/touch-events').res;
    registry.A=fake();installed.publish();const replaced=second.lines.at(-1).controllers[0];assert.notEqual(replaced.generation,machine.generation);assert.equal(replaced.fresh,false);
    assert.equal(first.runner.listenerCount('status'),0);assert.equal(first.sender.listenerCount('load'),0);
    await assert.rejects(service.action({port:'A',generation:machine.generation,action:'pause'}),/changé/);
    now+=60000;installed.publish();assert(second.ended);assert.equal(second.lines.at(-1).rotate,true);
    installed.dispose();assert.equal(scheduled.intervals.size,0);assert.equal(scheduled.timeouts.size,0);assert.equal(registry.A.runner.listenerCount('status'),0);assert.equal(registry.A.sender.listenerCount('load'),0);
    assert.throws(()=>service.list(),/indisponible/);
    // Exercise the historical CNCjs copy when available; the portable release keeps
    // only this route-layout fixture, not a redundant third-party server bundle.
    const serverCopy=path.join(__dirname,'server/app.js');
    const fixture='function createApplication(app) {\n  app.use(apiBase, expressJwt({ credentialsRequired: true }));\n  // Register API routes with authorized access\n    app.get((0, _urljoin["default"])(_settings["default"].route, \'api/gcode\'), api.gcode.fetch);\n}\n';
    const original=fs.existsSync(serverCopy)?fs.readFileSync(serverCopy,'utf8'):fixture, once=patch(original), twice=patch(once);
    assert.equal(once,twice);assert(once.indexOf('BEGIN CNC TOUCH')>once.indexOf('credentialsRequired: true'));assert(!once.includes('/home/pi/'));
    assert.equal((once.match(/BEGIN CNC TOUCH CUSTOM V3/g)||[]).length,1);assert.throws(()=>patch('app.get("/api/gcode", fetch)'),/Unsupported/);
    const legacy=original.replace("    app.get((0, _urljoin[\"default\"])(_settings[\"default\"].route, 'api/gcode'), api.gcode.fetch);", "    require('/home/pi/cncjs-ui/job-service.js').install(app, __dirname);\n    app.get((0, _urljoin[\"default\"])(_settings[\"default\"].route, 'api/gcode'), api.gcode.fetch);");
    assert(!patch(legacy).includes('/home/pi/'));
    new (require('node:vm').Script)(once);
    console.log('PASS: compact backend auth/prefix, raw freshness, no G-code, nonce stream revocation, controller replacement, rotation/dispose and idempotent bootstrap; fake controllers only.');
  } finally {installed.dispose();fs.unlinkSync(path.join(dir,'test.nc'));fs.rmdirSync(dir);}
})().catch(error=>{console.error(error);process.exitCode=1;});
