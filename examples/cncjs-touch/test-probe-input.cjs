'use strict';
const assert = require('assert').strict;
const {EventEmitter} = require('events');
const {createProbeInput} = require('./probe-input');
let now=10000, closed=false, registry={};
function controller(port){return {type:'Grbl',options:{port},ready:true,isClose:()=>closed,runner:new EventEmitter(),command:()=>{throw Error('Forbidden command');}};}
const c=controller('TEST'); registry.TEST=c;
const input=createProbeInput({get:()=>registry},()=>now), read=()=>input.inspect('TEST');
const emit=raw=>c.runner.emit('status',{raw,pinState:''});
assert.equal(read().state,'unknown');assert.equal(read().code,'WAITING');
emit('<Idle|MPos:0,0,0|Pn:P>');assert.equal(read().state,'contact');assert.equal(read().canProbe,false);
emit('<Alarm|MPos:0,0,0|Pn:XYZ>');assert.equal(read().state,'free'); // Alarm doesn't hide passive input data.
emit('<Idle|MPos:0,0,0>');assert.equal(read().state,'unknown');assert.equal(read().code,'MISSING');
c.runner.emit('parameters',{prb:{x:1,y:2,z:3},success:1});assert.equal(read().state,'unknown');
for(const raw of [undefined,'[PRB:1,2,3:1]','<Idle,MPos:0,0,0,Pn:P>','<Idle|Pn:>','<Idle|Pn:PP>','<Idle|Pn:Q>','<Idle|Pn:P|Pn:X>','<Idle|Pn:p>','<Idle|Pn:P>\n']){
 emit(raw);assert.equal(read().state,'unknown',String(raw));
}
emit('<Hold:0|MPos:0,0,0|Pn:PD>');assert.equal(read().state,'contact');
now+=2501;assert.equal(read().state,'unknown');assert.equal(read().code,'STALE');
emit('<Idle|Pn:X>');assert.equal(read().state,'free');now-=1;assert.equal(read().state,'unknown');now+=1;
emit('<Idle|Pn:P>');c.runner.emit('startup',{});assert.equal(read().code,'WAITING');
emit('<Idle|Pn:P>');c.ready=false;assert.equal(read().state,'unknown');assert.equal(c.runner.listenerCount('status'),0);
c.ready=true;assert.equal(read().code,'WAITING');emit('<Idle|Pn:P>');
registry.TEST=controller('TEST');assert.equal(read().code,'WAITING');assert.equal(c.runner.listenerCount('status'),0);
const other=registry.TEST;other.runner.emit('status',{raw:'<Idle|Pn:P>'});assert.equal(read().state,'contact');
registry={};input.sync();assert.equal(other.runner.listenerCount('status'),0);assert.equal(other.runner.listenerCount('startup'),0);
registry.TEST=c;closed=true;assert.equal(read().state,'unknown');closed=false;
for(let i=0;i<10;i++)read();assert.equal(c.runner.listenerCount('status'),1);
input.dispose();assert.equal(c.runner.listenerCount('status'),0);
// Verify real installed CNCjs event schema on the Pi, without opening a serial connection.
if(process.argv[2]){
 const Runner=require(process.argv[2]).default,runner=new Runner();
 const mock=controller('PARSER');mock.runner=runner;
 const adapter=createProbeInput({get:()=>({PARSER:mock})},()=>now);
 adapter.inspect('PARSER');
 for(const pair of [['<Idle|MPos:0.000,0.000,0.000|Pn:P>','contact'],['<Idle|MPos:0,0,0>','unknown'],['<Alarm|MPos:0,0,0|Pn:X>','free']]){
   runner.parse(pair[0]);assert.equal(adapter.inspect('PARSER').state,pair[1]);
 }
 adapter.dispose();console.log('PASS installed CNCjs parser and runner, synthetic reports only.');
}
console.log('PASS probe input: explicit pins, missing/malformed reports, PRB ignored, stale/reset/reconnect, listener cleanup; zero commands.');
