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


