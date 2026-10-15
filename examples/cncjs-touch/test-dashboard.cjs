const fs=require('fs'),vm=require('vm'),assert=require('assert');
let now=10000;const listeners={},requests=[];
const {document,node:el,activeScreens,stats}=require('./dom-fixture.cjs').createDOM(['home']);
const context={document,window:{cncLibrarySelection:{file:'b.nc',name:'b.nc'},addEventListener:(n,f)=>listeners[n]=f},Date:{now:()=>now},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'fake'}}})},XMLHttpRequest:function(){this.open=(m,p)=>{assert.equal(m,'POST');assert.equal(p,'/api/watch/file');};this.setRequestHeader=()=>{};this.abort=()=>{this.aborted=true;};this.send=body=>requests.push({xhr:this,file:JSON.parse(body).file});}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/job-dashboard.js','utf8'),context);
assert.equal(requests.length,1);assert.equal(requests[0].file,'b.nc.cnctouch.json'); // Late subscriber gets initial preview.
const select=file=>listeners['cnc-library-select']({detail:{file,name:file}});
const status=(machine,simulation=true)=>listeners['cnc-job-status']({detail:{machine,simulation}});
const c={port:'SIMULATION',name:'a.nc',originalName:'A',revision:1,fresh:true,total:100,received:25,workflow:'running',remainingSeconds:45};
select('b.nc');status(c);assert.equal(requests.at(-1).file,'a.nc.cnctouch.json');
select('c.nc');assert.equal(requests.length,2);assert.equal(el('home-job-percent').textContent,'25 %');assert.match(el('home-job-eta').textContent,/45 s/);
const old=requests[0].xhr;old.status=200;old.responseText=JSON.stringify({data:JSON.stringify({file:'b.nc',preview:{image:'data:image/png;base64,AAAA'}})});old.onload();assert.equal(el('home-job-image').src,undefined);
const current=requests[1].xhr;current.status=200;current.responseText=JSON.stringify({data:JSON.stringify({file:'a.nc',preview:{image:'data:image/png;base64,AAAA'}})});current.onload();el('home-job-image').onload();assert.equal(el('home-job-image').hidden,false);
now+=10000;status({...c,workflow:'paused'});assert.match(el('home-job-eta').textContent,/En pause.*45 s/);
status({...c,received:100,remainingSeconds:0,workflow:'idle'});assert.equal(el('home-job-percent').textContent,'100 %');assert.match(el('home-job-eta').textContent,/Terminé/);
status({...c,workflow:'idle',canStart:false});assert.match(el('home-job-eta').textContent,/arrêté/);
status(null);assert.equal(el('home-job-percent').textContent,'—');assert.match(el('home-job-eta').textContent,/indisponible/);
let real={...c,port:'REAL',remainingSeconds:undefined,received:10};status(real,false);
for(let i=0;i<11;i++){now+=1000;real={...real,received:real.received+1};status(real,false);}
assert.match(el('home-job-eta').textContent,/estimé/);assert.match(el('home-job-note').textContent,/indicative/);
const navigate=name=>{activeScreens.clear();activeScreens.add(name);listeners['cnc-screen-change']({detail:name});};
navigate('menu');const count=requests.length,writes=stats.writes;
for(let i=0;i<50;i++)status(real,false);
assert.equal(stats.writes,writes);assert.equal(requests.length,count);
listeners['cnc-library-preview-updated']({detail:{file:'a.nc'}});assert.equal(requests.length,count);
navigate('home');assert.equal(requests.length,count+1);assert.equal(requests.at(-1).file,'a.nc.cnctouch.json');
const pending=requests.at(-1).xhr;navigate('menu');assert(pending.aborted);
const stable=stats.writes;pending.status=200;pending.responseText=JSON.stringify({data:JSON.stringify({file:'a.nc',preview:{image:'data:image/png;base64,AAAA'}})});pending.onload();assert.equal(stats.writes,stable);
navigate('home');assert.equal(requests.length,count+2);
console.log('PASS: loaded-file image, stale response, progress/estimate, zero hidden repaint/request, same-file invalidation, view abort and immediate reentry.');

// Estimation runs entirely on synthetic snapshots: no server and no controller commands.
function estimateFixture(monotonic=false){
  let wall=10000,elapsed=10000;
  const events={},dom=require('./dom-fixture.cjs').createDOM(['home']);
  const window={addEventListener:(name,fn)=>events[name]=fn};
  if(monotonic)window.performance={now:()=>elapsed};
  vm.runInNewContext(fs.readFileSync(__dirname+'/touch/job-dashboard.js','utf8'),{
    window,document:dom.document,Date:{now:()=>wall},localStorage:{getItem:()=>null},
    XMLHttpRequest:function(){throw Error('Unexpected network request');}
  });
  let machine={port:'TEST',name:'part.nc',revision:1,fresh:true,total:100,received:10,workflow:'running'};
  return {
    send(changes={},simulation=false){machine={...machine,...changes};events['cnc-job-status']({detail:{machine,simulation}});},
    advance(ms){wall+=ms;elapsed+=ms;},jumpWall(ms){wall+=ms;},
    eta:()=>dom.node('home-job-eta').textContent,
    percent:()=>dom.node('home-job-percent').textContent,
    progress:()=>dom.node('home-job-progress').value
  };
}
function learn(f){f.send({received:10});for(let i=1;i<=10;i++){f.advance(1000);f.send({received:10+i});}assert.match(f.eta(),/1 min 20 s/);}
for(const changes of [
  {total:Infinity},{total:NaN},{total:'100'},{total:0},{total:-1},
  {received:Infinity},{received:NaN},{received:null},{received:'25'},
  {received:-1},{received:101},{fresh:false}
]){
  const f=estimateFixture();learn(f);f.send(changes);
  assert.equal(f.percent(),'—',JSON.stringify(changes));assert.equal(f.progress(),0);
  assert.match(f.eta(),/état indisponible/);assert.doesNotMatch(f.eta(),/chargez|NaN|Infinity/);
  f.send({fresh:true,total:100,received:21});assert.match(f.eta(),/calcul en cours/);
}
for(const gap of [-1000,4000,3600000]){
  const f=estimateFixture();learn(f);f.advance(gap);f.send({received:21});
  assert.match(f.eta(),/calcul en cours/,'Discard an estimate across a discontinuity');
  for(let i=1;i<=10;i++){f.advance(1000);f.send({received:21+i});}
  assert.match(f.eta(),/1 min 9 s/);
}
{
  const f=estimateFixture(true);learn(f);f.jumpWall(-3600000);f.advance(1000);f.send({received:21});
  assert.match(f.eta(),/1 min 19 s/,'Elapsed clock must ignore wall-clock changes');
  f.send({workflow:'paused'});
  for(let i=0;i<20;i++){f.advance(1000);f.send();}
  assert.match(f.eta(),/En pause.*1 min 19 s/);
  f.send({workflow:'running'});f.advance(1000);f.send({received:22});
  assert.match(f.eta(),/1 min 18 s/,'Paused time must not increase the estimate');
  for(let i=0;i<20;i++)f.send();
  assert.match(f.eta(),/1 min 18 s/,'Repeated paints must not change the estimate');
  f.send({received:100});assert.match(f.eta(),/attendre la fin des mouvements/);
  assert.doesNotMatch(f.eta(),/Terminé/);
}
for(const remainingSeconds of [null,undefined,NaN,Infinity,-1,'60']){
  const f=estimateFixture();f.send({received:0,canStart:true,remainingSeconds},true);
  assert.match(f.eta(),/état indisponible/);assert.doesNotMatch(f.eta(),/0 s|NaN|Infinity/);
  f.send({canStart:false,workflow:'running'},true);assert.match(f.eta(),/calcul en cours/);
  f.send({workflow:'paused'},true);assert.match(f.eta(),/estimation suspendue/);
}
for(const changes of [{revision:2},{total:200},{received:5},{name:'other.nc'}]){
  const f=estimateFixture();learn(f);f.send(changes);assert.match(f.eta(),/calcul en cours/);
}
{
  const f=estimateFixture();f.send({name:'',total:0,received:0});assert.match(f.eta(),/chargez un fichier/);
  f.send({name:'part.nc',received:12.5,remainingSeconds:52.5},true);
  f.send({total:100},true);assert.equal(f.percent(),'12 %');assert.match(f.eta(),/53 s/);
}
console.log('PASS: strict finite counters, stale status, clock jumps, pause, sleep/relearning, job identity, malformed simulation duration and acknowledged-lines completion.');


