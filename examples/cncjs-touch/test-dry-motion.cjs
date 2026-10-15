const fs=require('fs'),vm=require('vm'),assert=require('assert');
function fixture(connected=true,compact=false){
 let time=10000,writes=0;const handlers={},socketEvents={},docEvents={},intervals=[],nodes={},requests=[];
 function element(attrs={},active=false){let text='',disabled=true;return {attrs,events:{},classList:{contains:()=>active,toggle(n,v){active=v;}},get textContent(){return text;},set textContent(v){writes++;text=v;},get disabled(){return disabled;},set disabled(v){writes++;disabled=v;},getAttribute:n=>attrs[n],setAttribute(n,v){attrs[n]=v;},addEventListener(n,f){this.events[n]=f;}};}
 const jogs=['X','Y','Z'].flatMap(axis=>[-1,1].map(dir=>element({'data-axis':axis,'data-dir':String(dir)})));
 const steps=[0.1,1,10].map(n=>element({'data-step':String(n)},n===1)),feeds=[200,800,1500].map(n=>element({'data-feed':String(n)},n===800));
 nodes.steps={querySelectorAll:()=>steps};nodes.feeds={querySelectorAll:()=>feeds};
 const node=id=>nodes[id]||(nodes[id]=element());
 const socket={connected,on(n,f){socketEvents[n]=f;},emit(){throw Error('No socket command permitted');}};
 const document={hidden:false,getElementById:node,querySelectorAll:()=>jogs,addEventListener(n,f){docEvents[n]=f;}};
 const window={cncSocket:socket,addEventListener(n,f){handlers[n]=f;},fetch(){throw Error('No request permitted');}};
 const transport={transportConnected:true,apiBase:'/cnc/api'};
 if(compact){window.cncState={get:()=>transport};window.CNCJobStream={};}
 function XHR(){this.open=(method,url)=>{assert.equal(method,'POST');assert.equal(url,(compact?'/cnc':'')+'/api/touch-motion/preview');};this.setRequestHeader=()=>{};this.abort=()=>{this.aborted=true;};this.send=text=>{this.body=JSON.parse(text);requests.push(this);};this.reply=(status=200,data)=>{this.status=status;this.responseText=JSON.stringify(data||{dryRun:true,port:this.body.port,axis:this.body.axis,distanceMm:this.body.direction*this.body.step,feedMmMin:this.body.feed});this.onload();};}
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/dry-motion.js','utf8'),{window,document,Date:class extends Date{static now(){return time;}},setInterval(f){intervals.push(f);},XMLHttpRequest:XHR,localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'test'}}})}});
 return {node,jogs,steps,feeds,socket,socketEvents,transport,document,docEvents,requests,status(machine,busy=false,simulation=false){handlers['cnc-job-status']({detail:{machine,busy,simulation}});},tick(ms){time+=ms;intervals.forEach(f=>f());},get writes(){return writes;}};
}
const f=fixture(),ready={port:'/dev/ttyACM9',type:'Grbl',activeState:'Idle',workflow:'idle',fresh:true,canLoad:true,canPreviewMotion:true};
const blocked=()=>assert(f.jogs.every(b=>b.disabled));
blocked();f.status(ready);assert(f.jogs.every(b=>!b.disabled));assert.match(f.node('jog-controller').textContent,/ttyACM9/);
f.jogs[1].events.click();blocked();f.jogs[1].events.click();assert.equal(f.requests.length,1);f.requests.at(-1).reply();assert.match(f.node('jog-feedback').textContent,/serveur : X\+ · 1 mm · 800 mm\/min/);
f.steps[0].events.click();f.feeds[2].events.click();f.jogs[4].events.click();f.requests.at(-1).reply();assert.match(f.node('jog-feedback').textContent,/Z− · 0.1 mm · 1500/);
const writes=f.writes;for(let i=0;i<20;i++)f.status(ready);assert.equal(f.writes,writes);
for(const change of [{activeState:'Alarm'},{activeState:'Run',workflow:'running'},{workflow:'paused'},{fresh:false},{loading:true},{canLoad:false},{canPreviewMotion:false},{canPreviewMotion:undefined},{type:'TinyG'}]){
 f.status({...ready,...change});blocked();f.jogs[1].events.click();assert(!f.node('jog-feedback').textContent.includes('Essai X'));
}
f.status(ready,true);blocked();f.status(ready);f.tick(3000);blocked();f.jogs[0].events.click();assert.match(f.node('jog-msg').textContent,/périmé/);
f.status(ready);f.socket.connected=false;f.socketEvents.disconnect();blocked();f.status(ready);blocked();
f.socket.connected=true;f.socketEvents.connect();blocked();f.status(ready);assert(!f.jogs[0].disabled);
f.status({...ready,port:'/dev/other'});assert.match(f.node('jog-controller').textContent,/other/);
f.document.hidden=true;f.docEvents.visibilitychange();blocked();f.document.hidden=false;f.docEvents.visibilitychange();blocked();f.status(ready);
f.status({...ready,activeState:'Alarm'},false,true);assert(!f.jogs[0].disabled); // Simulation cannot overwrite the real snapshot.
f.jogs[0].attrs['data-axis']='Q';f.jogs[0].events.click();assert(!f.node('jog-feedback').textContent.includes('Essai Q'));
f.socketEvents.connect_error();blocked();
const noConnection=fixture(false);noConnection.status(ready);assert(noConnection.jogs.every(b=>b.disabled));
const race=fixture();race.status(ready);
const start=()=>{race.jogs[1].events.click();return race.requests.at(-1);};
let pending=start();race.steps[2].events.click();assert(pending.aborted);pending.reply();assert(!race.node('jog-feedback').textContent.includes('Vérifié'));
pending=start();race.status({...ready,port:'OTHER'});assert(pending.aborted);pending.reply();assert(!race.node('jog-feedback').textContent.includes('Vérifié'));
pending=start();race.status({...ready,port:'OTHER',activeState:'Alarm'});assert(pending.aborted);pending.reply();assert(!race.node('jog-feedback').textContent.includes('Vérifié'));
race.status(ready);pending=start();race.tick(3000);assert(pending.aborted);pending.reply();assert(!race.node('jog-feedback').textContent.includes('Vérifié'));
race.status(ready);pending=start();pending.reply(409,{message:'Vitesse supérieure à la limite Z.'});assert.match(race.node('jog-feedback').textContent,/limite Z/);
pending=start();pending.reply(200,{dryRun:false});assert.match(race.node('jog-feedback').textContent,/incohérente/);
pending=start();pending.ontimeout();assert.match(race.node('jog-feedback').textContent,/non validé/);assert(!race.jogs[0].disabled);
pending=start();race.socketEvents.disconnect();assert(pending.aborted);pending.reply();assert(!race.node('jog-feedback').textContent.includes('Vérifié'));
const compact=fixture(false,true);compact.status(ready);assert(compact.jogs.every(b=>!b.disabled));assert.equal(Object.keys(compact.socketEvents).length,0);
compact.jogs[1].events.click();const compactPending=compact.requests.at(-1);compact.transport.transportConnected=false;compact.status(ready);assert(compactPending.aborted);assert(compact.jogs.every(b=>b.disabled));
compact.transport.transportConnected=true;compact.status(ready);assert(compact.jogs.every(b=>!b.disabled));
assert(!fs.readFileSync(__dirname+'/touch/app.js','utf8').includes('DRY_RUN'));
console.log('PASS: server preview only, request deduplication, late responses, errors/timeouts, guards, simulation isolation and unchanged render performance.');
