'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(){
  let now=10000,tick;
  const requests=[],snapshots=[],disconnects=[];
  class XHR{
    constructor(){this.status=200;this.responseText='';}
    open(method,url){assert.equal(method,'GET');this.url=url;}
    setRequestHeader(){}
    send(){requests.push(this);}
    abort(){this.aborted=true;}
  }
  const window={};vm.runInNewContext(fs.readFileSync(__dirname+'/touch/job-stream.js','utf8'),{window});
  const client=window.CNCJobStream.create({XMLHttpRequest:XHR,token:()=>'',clock:()=>now,
    timer:{setInterval(fn){tick=fn;return 1;},clearInterval(){tick=null;}},
    onSnapshot:p=>snapshots.push(p),onDisconnect:r=>disconnects.push(r),onStatus(){}});
  requests[0].responseText='{"loaded":true,"protocol":1}';requests[0].onload();
  const stream=requests[1];
  return {client,stream,requests,snapshots,disconnects,
    raw(text){stream.responseText+=text;if(stream.onprogress)stream.onprogress();},
    advance(ms){now+=ms;tick();},dispose(){client.dispose();assert.equal(tick,null);}};
}
const packet=(changes={})=>({version:1,epoch:'server',transportId:'connection',sequence:1,sentAt:10000,controllers:[],...changes});
const machine=(changes={})=>({port:'A',controllerId:'A',generation:'controller',type:'Grbl',activeState:'Idle',workflow:'idle',name:'part.nc',fresh:true,statusAgeMs:0,statusObservedAt:10000,canLoad:true,canStart:true,canResume:false,canPause:false,canStop:false,...changes});
const malformed=[null,[],{},packet({version:2}),packet({epoch:''}),packet({transportId:''}),
  ...[null,-1,0,1.5,'2',9007199254740992].map(sequence=>packet({sequence})),
  ...[null,-1,'10000'].map(sentAt=>packet({sentAt})),packet({controllers:{}}),packet({controllers:[null]}),
  packet({controllers:[machine(),machine()]}),
  ...[{port:''},{controllerId:'B'},{generation:''},{fresh:'true'},{canStart:'false'},
    {statusAgeMs:null},{statusAgeMs:-1},{statusAgeMs:'0'},{statusObservedAt:null},
    {statusObservedAt:-1},{workflow:null}].map(changes=>packet({controllers:[machine(changes)]}))
];
for(const data of malformed){
  const f=fixture();f.raw(JSON.stringify(data)+'\n');
  assert.equal(f.snapshots.length,0,JSON.stringify(data));assert(f.stream.aborted);
  assert.equal(f.client.alive(),false);assert.match(f.disconnects.at(-1),/invalide/);
  f.advance(1000);assert.equal(f.requests.length,2,'No retry storm after invalid data');f.dispose();
}
// JSON permits exponents that overflow a JavaScript number; JSON.stringify would hide this as null.
for(const key of ['sequence','sentAt']){
  const f=fixture();f.raw(JSON.stringify(packet()).replace('"'+key+'":'+packet()[key],'"'+key+'":1e400')+'\n');
  assert(f.stream.aborted);assert.equal(f.snapshots.length,0);f.dispose();
}
for(const changes of [{sequence:1},{sequence:0},{sequence:2,epoch:'other'}, {sequence:2,transportId:'other'}]){
  const f=fixture();f.raw(JSON.stringify(packet())+'\n');assert(f.client.alive());
  f.raw(JSON.stringify(packet(changes))+'\n');assert(f.stream.aborted);
  assert.equal(f.snapshots.length,1);assert.equal(f.client.alive(),false);f.dispose();
}
{
  const f=fixture(),line=JSON.stringify(packet({controllers:[machine()]}));
  f.raw(line.slice(0,25));assert.equal(f.snapshots.length,0);
  f.raw(line.slice(25)+'\n'+JSON.stringify(packet({sequence:3,controllers:[machine({fresh:false,statusAgeMs:null,statusObservedAt:null,canLoad:false,canStart:false})]}))+'\n');
  assert.equal(f.snapshots.length,2,'Partial NDJSON and skipped sequence numbers are valid');
  assert(f.client.alive());f.raw('{"rotate":true}\n');f.stream.onload();
  assert.equal(f.requests.length,3);assert.equal(f.client.alive(),false);
  const rotated=f.requests[2];rotated.responseText=JSON.stringify(packet({sequence:4,transportId:'new'}))+'\n';rotated.onprogress();
  assert(f.client.alive());assert.equal(f.snapshots.length,3);f.dispose();
}
for(const suffix of ['{"rotate":true}\n{"rotate":true}\n','{"rotate":true}\n'+JSON.stringify(packet({sequence:2}))+'\n']){
  const f=fixture();f.raw(JSON.stringify(packet())+'\n'+suffix);
  assert(f.stream.aborted);assert.match(f.disconnects.at(-1),/invalide/);
  assert.equal(f.snapshots.length,1);f.dispose();
}
console.log('PASS: invalid/overflowing envelopes, controller identities and flags, duplicate/out-of-order packets, partial NDJSON, stale reports, bounded recovery and rotation; no network.');
