'use strict';
// Réglages → Système → Tablette: version and update check, CNCjs host commands with a
// second confirming tap, refused during a job. Network is mocked; nothing is run.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {document,node,element,activeScreens}=require('./dom-fixture.cjs').createDOM(['settings']);
const panel=node('screen-settings'),section=node('ks-system'),foot=element('p');section.appendChild(foot);
panel.setAttribute('data-settings-tab','system');
let timers=[],requests=[],token='jwt',now=1e12,machine=null;
const handlers={};
const window={addEventListener:(n,f)=>handlers[n]=f,cncState:{get:()=>({apiBase:'/api',machine})}};
function XHR(){this.headers={};requests.push(this);}
XHR.prototype.open=function(m,u){this.method=m;this.url=u;};
XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
XHR.prototype.send=function(body){this.body=body;};
const context={window,document,XMLHttpRequest:XHR,
 Date:Object.assign(function(v){return new Date(v);},{now:()=>now}),
 localStorage:{getItem:()=>token?JSON.stringify({state:{session:{token}}}):null},
 setTimeout:(f,ms)=>{const id=timers.length+1;timers.push({f,ms,id,live:true});return id;},
 clearTimeout:id=>{const t=timers.find(x=>x.id===id);if(t)t.live=false;}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/tablet-actions.js','utf8'),context);
const box=section.children[0],[,version,update,list,status]=box.children;
const answer=(url,code,data)=>{const r=requests.filter(x=>x.url.startsWith(url)).at(-1);assert(r,'request to '+url);r.status=code;r.responseText=JSON.stringify(data);r.onload();};
assert.equal(section.children.at(-1),foot,'the block goes before the footnote');
assert.match(version.textContent,/inconnue/);
assert.equal(requests.length,0,'nothing loaded before the tab is shown');

handlers['cnc-settings-tab']({detail:'system'});
const listReq=requests.find(r=>r.url==='/api/commands');assert(listReq);assert.equal(listReq.headers.Authorization,'Bearer jwt');
const versionReq=requests.find(r=>r.url.startsWith('VERSION.json?'));assert(versionReq);assert.equal(versionReq.headers.Authorization,undefined,'no token for a static file');
handlers['cnc-settings-tab']({detail:'system'});assert.equal(requests.filter(r=>r.url==='/api/commands').length,1,'no duplicate list request in flight');
answer('/api/commands',200,{records:[
  {id:'u1',title:'Mettre à jour l’interface',enabled:true,commands:'secret shell'},
  {id:'r1',title:'Redémarrer la tablette',enabled:true},
  {id:'off',title:'Ancienne',enabled:false},{id:7,title:'bad'},{id:'blank',title:'  '}]});
assert.deepEqual(list.children.map(b=>b.textContent),['Mettre à jour l’interface','Redémarrer la tablette']);
assert(!list.children.some(b=>/secret/.test(b.textContent)),'shell commands are never shown');

// Version and update check against GitHub.
answer('VERSION.json',200,{commit:'bf9d81c7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',branch:'feat/touch-server-integration',repo:'storm8488/cncjs',deployedAt:'2026-10-16T16:35:00Z'});
assert.match(version.textContent,/^Interface bf9d81c · feat\/touch-server-integration · installée le /);
const gh=requests.at(-1);assert.equal(gh.url,'https://api.github.com/repos/storm8488/cncjs/commits/feat%2Ftouch-server-integration');
assert.equal(gh.headers.Authorization,undefined,'the CNCjs token never goes to GitHub');
answer('https://api.github.com',200,{sha:'0123456789abcdef',commit:{message:'feat(touch): something new\n\nbody'}});
assert.equal(update.textContent,'Mise à jour disponible : 0123456 — feat(touch): something new');assert.equal(update.getAttribute('data-state'),'available');
// Checked again only after ten minutes.
handlers['cnc-screen-change']();assert.equal(requests.filter(r=>r.url.startsWith('https://')).length,1);
now+=600001;handlers['cnc-screen-change']();answer('/api/commands',200,{records:[{id:'u1',title:'Mettre à jour l’interface'},{id:'r1',title:'Redémarrer la tablette'}]});
answer('https://api.github.com',200,{sha:'bf9d81c7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});assert.equal(update.textContent,'À jour.');
now+=600001;handlers['cnc-screen-change']();answer('/api/commands',200,{records:[{id:'u1',title:'Mettre à jour l’interface'},{id:'r1',title:'Redémarrer la tablette'}]});
requests.at(-1).onerror();assert.match(update.textContent,/impossible/);

// First tap arms, second tap runs; the arm expires after 8 s.
const [upd,reboot]=list.children;
upd.click();assert.equal(upd.textContent,'Confirmer : Mettre à jour l’interface');assert.equal(upd.getAttribute('data-state'),'armed');
assert(!requests.some(r=>r.method==='POST'),'one tap runs nothing');
const arm=timers.filter(x=>x.live).at(-1);assert.equal(arm.ms,8000);arm.live=false;arm.f();
assert.equal(upd.textContent,'Mettre à jour l’interface');
upd.click();reboot.click();assert.equal(reboot.getAttribute('data-state'),'armed');assert.equal(upd.getAttribute('data-state'),'idle','arming another action disarms the first');
reboot.click();
// The real machine state is asked to the server first, whatever the page shows.
const quiet={controllers:[{port:'/dev/ttyUSB0',fresh:true,workflow:'idle',activeState:'Idle'}]};
assert.equal(requests.at(-1).url,'/api/touch-job');assert.equal(requests.at(-1).method,'GET');
answer('/api/touch-job',200,quiet);
const post=requests.at(-1);assert.equal(post.method,'POST');assert.equal(post.url,'/api/commands/run/r1');assert.equal(post.headers.Authorization,'Bearer jwt');
assert(reboot.disabled&&upd.disabled,'buttons are disabled while the request is in flight');
reboot.click();assert.equal(requests.filter(r=>r.method==='POST').length,1);
post.status=200;post.responseText=JSON.stringify({taskId:'t1'});post.onload();
assert.match(status.textContent,/« Redémarrer la tablette » lancée/);assert(!reboot.disabled);
// Errors.
upd.click();upd.click();answer('/api/touch-job',200,quiet);let p=requests.at(-1);p.status=404;p.responseText='{}';p.onload();assert.match(status.textContent,/introuvable/);
upd.click();upd.click();answer('/api/touch-job',200,quiet);p=requests.at(-1);p.onerror();assert.match(status.textContent,/non lancée/);
// Homing, jogging, a stale report or an unreadable state: nothing is run.
for(const [controllers,reason] of [[[{fresh:true,workflow:'idle',activeState:'Home'}],/mouvement/],[[{fresh:true,workflow:'idle',activeState:'Jog'}],/mouvement/],
  [[{fresh:false,workflow:'idle',activeState:'Idle'}],/trop ancien/],[[{fresh:true,workflow:'idle',activeState:'Idle',spindleSpeed:8000}],/broche/],[null,/illisible/]]){
  const posts=requests.filter(r=>r.method==='POST').length;
  upd.click();upd.click();answer('/api/touch-job',controllers?200:500,controllers?{controllers}:{});
  assert.equal(requests.filter(r=>r.method==='POST').length,posts,'no command sent');assert.match(status.textContent,reason);assert(!upd.disabled);
}
// No controller connected at all: allowed.
upd.click();upd.click();answer('/api/touch-job',200,{controllers:[]});assert.equal(requests.at(-1).method,'POST');requests.at(-1).onerror();

// Refused during a running or paused job, with the reason shown.
for(const workflow of ['running','paused']){
  machine={workflow};handlers['cnc-job-status']();
  assert(upd.disabled&&reboot.disabled);assert.match(status.textContent,/pendant un travail/);
  const before=requests.length;upd.click();upd.click();assert.equal(requests.length,before);
}
machine={workflow:'idle'};handlers['cnc-job-status']();assert(!upd.disabled);

// Leaving the tab disarms; no session means no list request.
upd.click();panel.setAttribute('data-settings-tab','display');handlers['cnc-settings-tab']({detail:'display'});assert.equal(upd.getAttribute('data-state'),'idle');
panel.setAttribute('data-settings-tab','system');token='';handlers['cnc-settings-tab']({detail:'system'});
assert.match(status.textContent,/Session CNCjs requise/);assert.equal(list.children.length,0);
// Empty list.
token='jwt';handlers['cnc-settings-tab']({detail:'system'});answer('/api/commands',200,{records:[]});assert.match(status.textContent,/Aucune commande/);
for(const name of ['index.html','simulation.html']){
  const html=fs.readFileSync(__dirname+'/touch/'+name,'utf8');
  assert.equal((html.match(/src="tablet-actions\.js/g)||[]).length,1);
  assert(html.indexOf('system-monitor.js')<html.indexOf('tablet-actions.js'),'the system panel exists before the actions are added');
}
console.log('PASS tablet actions: titles only, two-tap confirmation with expiry, refused during a job, version and update check, no token to GitHub.');
