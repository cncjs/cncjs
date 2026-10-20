const assert=require('assert').strict,fs=require('fs'),vm=require('vm'),path=require('path'),P=require('./touch/probe-model');
function checked(engine){engine.resetContact();engine.contact('free');engine.contact('contact');engine.contact('free');assert.equal(engine.snapshot().contactVerified,true);}
const base={profile:P.demo(),operation:'XYZ',diameter:6,wcs:'G54',scenario:'success',confirmed:true,idle:true};
// Independently constructed physical geometry examples: edge E, face E+offset,
// tool centre at contact = face - direction*radius. Recovery must give E.
for(const axis of ['X','Y'])for(const direction of [-1,1])for(const edge of [-130,0,250])for(const offset of [-8,0,12]){
 const p=P.demo();p['direction'+axis]=direction;p['face'+axis]=offset;
 assert.equal(P.compensate(axis,edge+offset-direction*3,p,6),edge);
}
assert.equal(P.compensate('Z',30,P.demo(),null),20);
assert.equal(P.compensate('Z',-15,P.demo(),null),-25);
assert(P.validate(P.empty(),'XYZ',null).length>0);
assert(P.validate({...P.demo(),faceX:null},'X',6).length>0);
assert.equal(P.validate({...P.demo(),faceX:null},'Z',null).length,0);
assert(P.validate({...P.demo(),thickness:'10'},'Z',6).length>0);
assert(P.validate({...P.demo(),slow:101},'Z',6).length>0);
assert(P.validate({...P.demo(),retract:10},'Z',6).length>0);
assert.equal(P.normalize({thickness:Infinity,faceX:'0',unknown:'secret'}).thickness,null);
assert(!('unknown' in P.normalize({unknown:'secret'})));
const disabled=P.create('disabled');assert.throws(()=>disabled.contact('free'));assert.throws(()=>disabled.start(base),/non raccordé/);
for(const op of ['X','Y','Z','XYZ']){
 const e=P.create('simulation');assert.throws(()=>e.start({...base,operation:op}),/contact/);
 checked(e);e.start({...base,operation:op});assert.throws(()=>e.start(base),/cours/);
 let ticks=0;
 while(e.snapshot().running){const before=e.snapshot();if(before.phase!=='apply'&&before.phase!=='clear')assert.deepEqual(before.applied,{});e.advance();assert(++ticks<40);}
 assert.equal(e.snapshot().phase,'done');assert.equal(e.snapshot().progress,100);
 assert.equal(Object.keys(e.snapshot().applied).length,op.length);
 const report=e.report();report.state.applied.X=999;assert.notEqual(e.snapshot().applied.X,999);
 assert.throws(()=>e.start(base),/contact/); // Every new cycle needs a new contact test.
}
for(const scenario of ['initial-contact','no-contact','stuck','disconnect','xyz-failure','timeout','partial-apply']){
 const e=P.create('simulation');checked(e);e.start({...base,scenario});
 for(let i=0;e.snapshot().running&&i<40;i++)e.advance();
 assert.equal(e.snapshot().phase,'failed');assert.equal(e.snapshot().probe,'unknown');
 assert.equal(e.snapshot().contactVerified,false);
 assert.equal(Object.keys(e.snapshot().applied).length,scenario==='partial-apply'?1:0);
 const state=JSON.stringify(e.snapshot());e.advance();assert.equal(JSON.stringify(e.snapshot()),state);
 if(scenario==='partial-apply'){checked(e);assert.throws(()=>e.start(base),/réinitialisez/);assert.equal(e.snapshot().uncertain,true);}
}
const stopped=P.create('simulation');checked(stopped);stopped.start(base);stopped.advance();stopped.stop();assert.equal(stopped.snapshot().phase,'failed');assert.deepEqual(stopped.snapshot().applied,{});
const mutated=P.create('simulation'),mutable=JSON.parse(JSON.stringify(base));checked(mutated);mutated.start(mutable);mutable.profile.thickness=99;while(mutated.snapshot().running)mutated.advance();assert.equal(mutated.snapshot().applied.Z,20);
const log=P.create('simulation');for(let i=0;i<150;i++)log.contact(i%2?'contact':'free');assert.equal(log.report().events.length,100);
// No browser/network facilities exist in this VM. The module remains pure.
const isolated={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'touch/probe-model.js'),'utf8'),isolated);assert.equal(typeof isolated.window.CNCProbe.create,'function');
console.log('PASS: signed XY compensation, Z thickness, profiles, all operations/faults, no partial success, bounded journal, no transport.');
