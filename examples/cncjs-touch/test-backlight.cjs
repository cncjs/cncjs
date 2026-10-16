'use strict';
// Affichage → Luminosité: status on display, one request at a time with the last
// slider position winning, ±10 steps, minimum 5 %, read-only and missing panels.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {document,node,element,activeScreens}=require('./dom-fixture.cjs').createDOM(['menu']);
const panel=node('screen-settings'),footer=element('div');footer.className='wide ks-display-footer';panel.appendChild(footer);
panel.querySelector=sel=>sel==='.ks-display-footer'?footer:null;
let requests=[],token='jwt';
const handlers={};
const window={addEventListener:(n,f)=>handlers[n]=f,cncState:{get:()=>({apiBase:'/api'})}};
function XHR(){this.headers={};requests.push(this);}
XHR.prototype.open=function(m,u){this.method=m;this.url=u;};
XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
XHR.prototype.send=function(body){this.body=body;};
const storage=new Map();
const context={window,document,XMLHttpRequest:XHR,localStorage:{getItem:k=>k==='cnc'?(token?JSON.stringify({state:{session:{token}}}):null):(storage.has(k)?storage.get(k):null),setItem:(k,v)=>storage.set(k,String(v))}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/backlight.js','utf8'),context);
// A page loaded while the panel may be off asks the server to wake it, once.
assert.equal(requests.length,1);assert.equal(requests[0].method,'POST');assert.deepEqual(JSON.parse(requests[0].body),{wake:true});
requests[0].status=200;requests[0].responseText='{}';requests[0].onload();requests.length=0;
const card=panel.children[0];
assert.equal(card.id,'ks-backlight');assert.equal(panel.children[1],footer,'the card goes before the footer');
const row=card.children[2],[down,slider,up,value]=row.children,sleepRow=card.children[3],select=sleepRow.children[1],status=card.children[4];
const answer=(code,data)=>{const r=requests.at(-1);r.status=code;r.responseText=JSON.stringify(data);r.onload();};
const posts=()=>requests.filter(r=>r.method==='POST');

assert.equal(requests.length,0,'nothing is read while the settings screen is not shown');
assert(down.disabled&&slider.disabled&&up.disabled,'disabled until the status is known');
assert.equal(select.value,'off','the panel is turned off during the screen saver by default');
assert.deepEqual(select.children.map(o=>o.value),['off','min','keep']);
activeScreens.clear();activeScreens.add('settings');handlers['cnc-screen-change']();
assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');assert.equal(requests[0].url,'/api/touch-backlight');assert.equal(requests[0].headers.Authorization,'Bearer jwt');
handlers['cnc-screen-change']();assert.equal(requests.length,1,'no duplicate read in flight');
answer(200,{available:true,writable:true,device:'backlight',percent:50,minPercent:5});
assert(!slider.disabled&&!down.disabled&&!up.disabled);assert.equal(slider.value,'50');assert.equal(value.textContent,'50 %');assert.equal(status.textContent,'');

// A drag: the first value is sent, later ones wait, and only the last of them follows.
slider.value='65';slider.handlers.input();assert.equal(posts().length,1);assert.deepEqual(JSON.parse(posts()[0].body),{percent:65});assert.equal(value.textContent,'65 %');
slider.value='70';slider.handlers.input();slider.value='85';slider.handlers.input();assert.equal(posts().length,1,'one request at a time');
answer(200,{available:true,writable:true,percent:65});
assert.equal(posts().length,2);assert.deepEqual(JSON.parse(posts()[1].body),{percent:85});assert.equal(slider.value,'85','an older answer never moves the slider back');
answer(200,{available:true,writable:true,percent:85});assert.equal(slider.value,'85');assert.equal(value.textContent,'85 %');
// Steps of 10, clamped to 5..100.
up.click();assert.deepEqual(JSON.parse(posts().at(-1).body),{percent:95});answer(200,{available:true,writable:true,percent:95});
up.click();answer(200,{available:true,writable:true,percent:100});up.click();assert.deepEqual(JSON.parse(posts().at(-1).body),{percent:100});answer(200,{available:true,writable:true,percent:100});
slider.value='10';slider.handlers.input();answer(200,{available:true,writable:true,percent:10});
down.click();assert.deepEqual(JSON.parse(posts().at(-1).body),{percent:5},'never below 5 %');answer(200,{available:true,writable:true,percent:5});
down.click();assert.deepEqual(JSON.parse(posts().at(-1).body),{percent:5});answer(200,{available:true,writable:true,percent:5});

// A refusal shows the reason and re-reads the status.
up.click();const before=requests.length;answer(409,{message:'Réglage refusé : le système ne permet pas à CNCjs de modifier la luminosité.'});
assert.match(status.textContent,/Réglage refusé/);assert.equal(requests.length,before+1);assert.equal(requests.at(-1).method,'GET');
answer(200,{available:true,writable:false,percent:5});
assert(slider.disabled&&up.disabled&&down.disabled);assert.match(status.textContent,/règle udev/);
const sent=posts().length;up.click();slider.handlers.input();assert.equal(posts().length,sent,'nothing is sent to a read-only panel');
// No panel at all.
handlers['cnc-settings-tab']({detail:'display'});answer(200,{available:false,writable:false,percent:null,minPercent:5});
assert.match(status.textContent,/Aucun rétroéclairage/);assert.equal(value.textContent,'—');
// Errors and session.
handlers['cnc-screen-change']();answer(404,{});assert.match(status.textContent,/ne gère pas/);
token='';handlers['cnc-screen-change']();assert.match(status.textContent,/Session CNCjs requise/);token='jwt';
// Hidden page: no read.
document.hidden=true;const n=requests.length;document.handlers.visibilitychange();assert.equal(requests.length,n);document.hidden=false;
// Screen saver: off by default, minimum, or unchanged; the operator level comes back on wake.
const saver=v=>handlers['cnc-screen-saver-sleep']({detail:v});
handlers['cnc-screen-change']();answer(200,{available:true,writable:true,percent:60,userPercent:60,temporary:false});
let mark=requests.length;saver(true);
assert.equal(requests.length,mark+1);assert.deepEqual(JSON.parse(requests.at(-1).body),{percent:0,temporary:true});
saver(false);assert.equal(requests.length,mark+1,'the wake waits for the dim answer');
answer(200,{percent:0,userPercent:60,temporary:true});
assert.deepEqual(JSON.parse(requests.at(-1).body),{wake:true});answer(200,{percent:60,userPercent:60,temporary:false});
assert.equal(slider.value,'60','a temporary level never reaches the slider');
saver(false);assert.equal(requests.length,mark+2,'no wake without a dim');
select.value='min';select.handlers.change();assert.deepEqual(JSON.parse(storage.get('cncjs-touch-backlight-v1')),{sleep:'min'});
saver(true);assert.deepEqual(JSON.parse(requests.at(-1).body),{percent:5,temporary:true});answer(200,{});saver(false);answer(200,{});
select.value='keep';select.handlers.change();mark=requests.length;saver(true);saver(false);assert.equal(requests.length,mark,'unchanged: nothing sent');
select.value='bogus';select.handlers.change();assert.deepEqual(JSON.parse(storage.get('cncjs-touch-backlight-v1')),{sleep:'keep'});
// A read-only panel is left alone.
select.value='off';select.handlers.change();handlers['cnc-screen-change']();answer(200,{available:true,writable:false,percent:60});
mark=requests.length;saver(true);assert.equal(requests.length,mark);
for(const name of ['index.html','simulation.html']){
  const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');
  assert.equal((html.match(/src="backlight\.js/g)||[]).length,1);
  assert(html.indexOf('display-settings.js')<html.indexOf('backlight.js'),'the settings cards exist before the brightness card');
}
console.log('PASS backlight: shown-only reads, one request at a time with the last value winning, steps and minimum, read-only and missing panels.');
