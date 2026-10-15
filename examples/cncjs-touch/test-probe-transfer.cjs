'use strict';
const assert=require('assert').strict;
const model=require('./touch/probe-model'),transfer=require('./touch/probe-transfer');
const base=model.empty();base.name='Sonde réelle incomplète';base.faceX=-4.25;
const text=transfer.encode([base],'real');
assert.deepEqual(transfer.decode(text,'real'),[base]);
assert.deepEqual(transfer.decode('\ufeff'+text,'real'),[base]);
assert.throws(()=>transfer.decode(text,'simulation'),/RÉEL/);
assert.throws(()=>transfer.decode(transfer.encode([model.demo()],'simulation'),'real'),/SIMULATION/);
assert.throws(()=>transfer.decode('x'.repeat(65537),'real'),/volumineux/);
assert.throws(()=>transfer.decode('{','real'),/illisible/);
const data=JSON.parse(text);
for(const bad of [{...data,version:2},{...data,units:'inch'},{...data,token:'secret'},{...data,kind:'other'},{...data,profiles:[]},{...data,profiles:Array(9).fill(base)},JSON.parse('{"__proto__":{},"kind":"cnc-touch-probe-profiles","version":1,"mode":"real","units":"mm-mm/min","profiles":[]}')])assert.throws(()=>transfer.decode(JSON.stringify(bad),'real'));
for(const change of [{name:''},{name:'x'.repeat(61)},{name:'a\nb'},{directionX:0},{directionX:'1'},{faceX:'1.5'},{faceX:101},{thickness:0},{search:0},{corner:'north'},{fast:20,slow:21},{search:1,retract:1},{unexpected:1}]){
 assert.throws(()=>transfer.encode([{...base,...change}],'real'),JSON.stringify(change));
}
assert.throws(()=>transfer.encode([{...base,fast:Infinity}],'real'));
assert.throws(()=>transfer.encode([{...base,fast:NaN}],'real'));
const second={...base,name:'Autre sonde',directionX:-1,faceX:-100,faceY:100};
const before=JSON.stringify([base,second]);
let result=transfer.merge([base],[base,second,second]);
assert.equal(result.added,1);assert.equal(result.duplicates,2);assert.equal(result.profiles.length,2);
assert.equal(JSON.stringify([base,second]),before);
result.profiles[0].faceX=30;assert.equal(base.faceX,-4.25);
assert.throws(()=>transfer.merge([base],[{...base,faceX:8}]),/nom/);
assert.throws(()=>transfer.merge([base],[{...base,name:base.name.toUpperCase(),faceX:8}]),/nom/);
const full=Array.from({length:8},(_,i)=>({...base,name:'Sonde '+i}));
assert.throws(()=>transfer.merge(full,[second]),/8 profils/);assert.equal(full.length,8);
assert.equal(transfer.merge(full,[full[0]]).duplicates,1);
assert.throws(()=>transfer.merge([base],[second,{...second,name:'Invalide',fast:-1}]));
assert.equal(JSON.stringify([base,second]),before);
// Exact field copying: no diameter, confirmation or motion/session state can be transferred.
assert.deepEqual(Object.keys(JSON.parse(text)),['kind','version','mode','units','profiles']);
assert.deepEqual(Object.keys(transfer.decode(text,'real')[0]),Object.keys(model.empty()));
console.log('PASS: probe backup round-trip, strict schema/units/modes/bounds, incomplete values, duplicate/conflict/capacity handling, atomic immutable merge.');
