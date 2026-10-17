const assert=require('assert').strict,fs=require('fs'),path=require('path'),vm=require('vm');
const {createDOM}=require('./dom-fixture.cjs');
function setup(language='fr',fail=false){
 const dom=createDOM(['settings']),saved=new Map([['cncjs-touch-language-v1',language]]),events={},state={blocked:false},calls={reload:0},dialogs=[];
 dom.document.documentElement={lang:''};dom.document.querySelectorAll=()=>dialogs;
 const window={addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n],dispatchEvent:e=>{if(events[e.type])events[e.type](e);},location:{reload:()=>calls.reload++},cncScreenSaver:{status:()=>state}};
 const context={window,document:dom.document,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('storage disabled');saved.set(k,v);}},Event:class{constructor(type){this.type=type;}}};
 ['i18n-messages.js','i18n.js','language-settings.js'].forEach(name=>vm.runInNewContext(fs.readFileSync(path.join(__dirname,'touch',name),'utf8'),context));
 return {...dom,window,events,state,calls,saved,dialogs};
}
for(const language of ['en','es']){
 const s=setup(language),i=s.window.cncI18n;
 assert.equal(s.document.documentElement.lang,language);
 assert.equal(i.t('Fichiers'),language==='en'?'Files':'Archivos');
 assert.equal(i.t('Réponse de suivi invalide.'),language==='en'?'Invalid monitoring response.':'Respuesta de seguimiento no válida.');
 assert.equal(i.t('  Fichiers  '),language==='en'?'  Files  ':'  Archivos  ');
 // Rows written with outer spaces are found too, and the caller's spaces are kept.
 assert.equal(i.t(' tr/min'),' rpm');assert.equal(i.t('Avance réelle '),language==='en'?'Actual feed ':'Avance real ');
 assert.equal(i.t(' · Broche '),language==='en'?' · Spindle ':' · Husillo ');
 // Rows matched exactly keep their translation as written (French « » need spaces, “ ” do not).
 assert.equal(i.t('Envoi de « '),language==='en'?'Sending “':'Enviando «');assert.equal(i.t(' »…'),language==='en'?'”…':'»…');
 assert.equal(i.t('Envoi de « ')+'Reboot'+i.t(' »…'),language==='en'?'Sending “Reboot”…':'Enviando «Reboot»…');
 assert.equal(i.t('Menu.gcode'),'Menu.gcode');assert.equal(i.t('G54 G0 X1'),'G54 G0 X1');
 assert.equal(i.t('Unknown controller message'),'Unknown controller message');
 assert.equal(i.html('<button id="Fichiers" data-route="files" title="Fichiers">Fichiers</button>'),language==='en'?'<button id="Fichiers" data-route="files" title="Files">Files</button>':'<button id="Fichiers" data-route="files" title="Archivos">Archivos</button>');
 assert.equal(i.html('<option value="simulation">SIMULATION</option>'),language==='en'?'<option value="simulation">SIMULATION</option>':'<option value="simulation">SIMULACIÓN</option>');
 assert.equal(i.html('<h2>Fichiers'),language==='en'?'<h2>Files':'<h2>Archivos');
 const keys=new Set();s.window.CNCTouchMessages.forEach(row=>{const key=row[0].trim().replace(/\s+/g,' ');assert(!keys.has(key),'duplicate: '+row[0]);keys.add(key);assert.equal(row.length,3);row.forEach(value=>assert(typeof value==='string'&&value.length>0));});
 // A translated browser must retain the exact protocol and calculation contracts.
 const runtime={window:s.window};
 ['probe-model.js','coordinate-plan.js'].forEach(name=>vm.runInNewContext(fs.readFileSync(path.join(__dirname,'touch',name),'utf8'),runtime));
 const P=s.window.CNCProbe,e=P.create('simulation');
 e.resetContact();e.contact('free');e.contact('contact');e.contact('free');
 assert.equal(e.snapshot().probe,'free');assert.equal(e.snapshot().contactVerified,true);
 e.start({profile:P.demo(),operation:'XYZ',diameter:6,wcs:'G54',scenario:'success',confirmed:true,idle:true});
 let ticks=0;while(e.snapshot().running){e.advance();assert(++ticks<40);}
 assert.equal(e.snapshot().phase,'done');assert.equal(e.report().mode,'simulation-palpage');
 assert.equal(e.report().parameters.wcs,'G54');assert.equal(P.empty().name,'Nouvelle sonde');
 assert.throws(()=>P.create('disabled').start({}));
 const C=s.window.CNCCoordinates,result=C.plan({wcs:'G55',workPosition:{x:10},machinePosition:{x:110}},{axis:'x',operation:'shift',unit:'mm',value:'1,5',feed:100});
 assert.equal(result.wcs,'G55');assert.equal(result.targetMachineMm,111.5);assert.equal(result.offsetMm,100);
}
let s=setup('invalid');assert.equal(s.window.cncI18n.language,'fr');assert.equal(s.window.cncI18n.t('Fichiers'),'Fichiers');assert(!s.window.cncI18n.save('de'));assert.equal(s.saved.get('cncjs-touch-language-v1'),'invalid');
function choose(s,language){s.node('display-language').value=language;s.node('display-language').handlers.change();}
s=setup();choose(s,'en');assert(!s.node('language-apply').disabled);s.node('language-apply').click();assert.equal(s.saved.get('cncjs-touch-language-v1'),'en');assert.equal(s.calls.reload,1);
s=setup();choose(s,'es');s.state.blocked=true;s.node('language-apply').handlers.click();assert.equal(s.calls.reload,0);assert.equal(s.saved.get('cncjs-touch-language-v1'),'fr');assert(s.node('language-status').textContent.includes('retour au repos'));s.state.blocked=false;s.events['cnc-screen-saver-status']();s.node('language-apply').click();assert.equal(s.calls.reload,1);
s=setup();choose(s,'en');s.events['cnc-job-status']({detail:{busy:true}});assert(s.node('language-apply').disabled);s.node('language-apply').handlers.click();assert.equal(s.calls.reload,0);
s=setup();choose(s,'en');s.dialogs.push({hidden:false,getClientRects:()=>[{}]});s.node('language-apply').handlers.click();assert.equal(s.calls.reload,0);assert(s.node('language-status').textContent.includes('confirmation'));
s=setup();choose(s,'en');s.document.hidden=true;s.node('language-apply').handlers.click();assert.equal(s.calls.reload,0);
s=setup('fr',true);choose(s,'es');s.node('language-apply').click();assert.equal(s.calls.reload,0);assert(s.node('language-status').textContent.includes('Impossible'));
s=setup();choose(s,'es');s.events.pagehide({persisted:true});assert(s.events['cnc-job-status']);s.events.pagehide({persisted:false});assert(!s.events['cnc-job-status']);assert(!s.node('language-apply').handlers.click);
for(const name of ['index.html','simulation.html']){const html=fs.readFileSync(path.join(__dirname,'touch',name),'utf8');assert(html.indexOf('i18n-messages.js')<html.indexOf('i18n.js'));assert(html.indexOf('i18n.js')<html.indexOf('cnc-state.js'));assert(html.indexOf('language-settings.js')>html.indexOf('touch-shell.js'));}
console.log('PASS languages: catalogs, whitespace, HTML attributes, protocol/data preservation, persistence, idle-only reload, pending actions, dialogs, storage failures and lifecycle.');
