'use strict';
const assert=require('assert').strict,model=require('./touch/probe-model'),preparation=require('./touch/probe-preparation');
const good={simulation:true,profile:model.demo(),operation:'XYZ',diameter:6,wcs:'G54',state:{running:false,uncertain:false,contactVerified:true,probe:'free'},available:true,confirmed:true};
assert.equal(preparation.inspect(good).ready,true);
// Unknown real conditions and even perfect demo data must never grant physical permission.
for(const signal of ['free','contact','unknown']){
 const result=preparation.inspect({...good,simulation:false,state:{...good.state,probe:signal}});
 assert.equal(result.ready,false);assert.equal(result.items[0].title,'Palpage réel désactivé');
}
const empty=preparation.inspect({...good,profile:model.empty(),diameter:null});
const validation=model.validate(model.empty(),'XYZ',null);
assert.deepEqual(empty.items.map(i=>i.detail),validation);
assert(!validation.some(v=>v.includes('inférieur')),'Unconfigured distances must not create a false comparison');
assert(model.validate({...model.demo(),retract:10},'Z',null).some(v=>v.includes('inférieur')));
assert(model.validate({...model.demo(),slow:101},'Z',null).some(v=>v.includes('rapide')));
for(const change of [{available:false},{confirmed:false},{wcs:'G53'},{state:{...good.state,running:true}},{state:{...good.state,uncertain:true}},{state:{...good.state,contactVerified:false}},{state:{...good.state,probe:'contact'}}]){
 const r=preparation.inspect({...good,...change});assert.equal(r.ready,false);assert(r.items.length);
}
// Only the selected operation's parameters are required; zero signed offsets are valid.
assert.equal(preparation.inspect({...good,operation:'Z',diameter:null,profile:{...good.profile,directionX:null,directionY:null,faceX:null,faceY:null}}).ready,true);
assert.equal(preparation.inspect({...good,operation:'X',profile:{...good.profile,thickness:null,directionY:null,faceY:null,faceX:0}}).ready,true);
const original=JSON.stringify(good);for(let n=0;n<100;n++)preparation.inspect(good);assert.equal(JSON.stringify(good),original);
// The ready explanation agrees with a full fictitious contact test and engine start.
const engine=model.create('simulation');engine.contact('free');engine.contact('contact');engine.contact('free');
assert(preparation.inspect({...good,state:engine.snapshot()}).ready);
engine.start({profile:good.profile,operation:good.operation,diameter:good.diameter,wcs:good.wcs,scenario:'success',confirmed:true,idle:true});
assert.equal(preparation.inspect({...good,state:engine.snapshot()}).ready,false);
assert.equal(preparation.inspect({}).ready,false);
// What the operator reads: the count of blocking points, the ready title, the real-mode title and notes.
assert.equal(preparation.inspect(good).title,'Prêt pour la simulation uniquement');
assert.equal(preparation.inspect({...good,confirmed:false,available:false}).title,'2 point(s) avant simulation');
const real=preparation.inspect({...good,simulation:false});
assert.equal(real.title,'Préparation réelle · lancement désactivé');assert.match(real.note,/câblage/);assert.match(preparation.inspect(good).note,/banc fictif/);
assert.equal(real.items.length,1,'real mode: only the disabled launch, no simulation gate');
console.log('PASS: all missing parameters, operation-specific requirements, no null comparison, simulation gates, real always blocked, immutable inputs and engine agreement.');
