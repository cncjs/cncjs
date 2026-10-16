'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const key='cncjs-touch-display-v1',defaults={size:'standard',machine:true,sleepMinutes:5,clock:true};
function memory(initial=null){
 const values=new Map([[key,initial],['unrelated','preserve']]);
 return {values,writeCount:0,failRead:false,failWrite:false,silent:false,
   getItem(k){if(this.failRead)throw Error('denied');return values.get(k)??null;},
   setItem(k,value){this.writeCount++;if(this.failWrite)throw Error('quota');if(!this.silent)values.set(k,value);}};
}
function fixture(storage=memory()){
 const dom=require('./dom-fixture.cjs').createDOM(['settings']),events={},classes=new Set(),sleep=[];
 dom.document.body.classList.toggle=(name,enabled)=>enabled?classes.add(name):classes.delete(name);
 dom.document.documentElement={};dom.node('screen-home').querySelector=()=>null;
 const sizes=['standard','large'].map(size=>{const b=dom.element('button');b.setAttribute('data-display-size',size);return b;});
 dom.node('screen-settings').querySelectorAll=()=>sizes;
 const window={innerWidth:1366,innerHeight:768,addEventListener(n,f){events[n]=f;},dispatchEvent(e){if(events[e.type])events[e.type](e);},
   cncScreenSaver:{configure:n=>sleep.push(n),status:()=>({blocked:false,reason:''}),preview:()=>true}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/display-settings.js','utf8'),{window,document:dom.document,localStorage:storage,Promise,Event:class{constructor(type){this.type=type;}}});
 return {...dom,storage,classes,sleep,sizes,feedback:()=>dom.node('display-feedback').textContent,
   delay(n){const select=dom.node('display-sleep-delay');select.value=String(n);select.handlers.change.call(select);}};
}
let s=memory(),a=fixture(s);assert.equal(s.writeCount,0);assert.equal(a.sleep.at(-1),5);
a.delay(10);assert.deepEqual(JSON.parse(s.getItem(key)),{...defaults,sleepMinutes:10});assert.match(a.feedback(),/enregistrées/);
a.sizes[1].click();a.node('display-machine-toggle').click();
assert.deepEqual(JSON.parse(s.getItem(key)),{size:'large',machine:false,sleepMinutes:10,clock:true});
let restored=fixture(s);assert(restored.classes.has('display-large'));assert(restored.classes.has('display-hide-machine'));assert.equal(restored.sleep.at(-1),10);
assert.equal(restored.node('display-resolution').textContent,'1366 × 768');
// A second tab may change persistent state; a stale page must not overwrite it, even via reset.
restored.delay(30);const newer=s.getItem(key);a.delay(1);
assert.equal(s.getItem(key),newer);assert.equal(a.sleep.at(-1),1);assert.match(a.feedback(),/autre onglet/);
a.node('display-reset').click();assert.equal(s.getItem(key),newer);assert.match(a.feedback(),/autre onglet/);
restored.node('display-reset').click();assert.deepEqual(JSON.parse(s.getItem(key)),defaults);
assert.equal(s.getItem('unrelated'),'preserve');
// Invalid/future state is preserved until this page's explicit display reset.
for(const invalid of ['{','null','[]','false',JSON.stringify({size:'huge'}),JSON.stringify({machine:'false'}),JSON.stringify({sleepMinutes:'5'}),JSON.stringify({sleepMinutes:123}),JSON.stringify({...defaults,version:2})]){
 s=memory(invalid);a=fixture(s);assert.equal(s.writeCount,0);assert.match(a.feedback(),/illisibles/);
 a.delay(2);assert.equal(s.getItem(key),invalid);assert.equal(a.sleep.at(-1),2);assert.match(a.feedback(),/illisibles/);
 a.node('display-reset').click();assert.deepEqual(JSON.parse(s.getItem(key)),defaults);assert.match(a.feedback(),/enregistrées/);
}
for(const initial of [JSON.stringify({}),JSON.stringify({size:'large'}),JSON.stringify({machine:false})]){
 s=memory(initial);a=fixture(s);a.delay(0);assert.equal(JSON.parse(s.getItem(key)).sleepMinutes,0);
}
// Failed storage must never be reported as saved; current-page changes remain usable.
s=memory();a=fixture(s);s.silent=true;a.delay(2);assert.equal(s.getItem(key),null);assert.match(a.feedback(),/confirmée/);assert.equal(a.sleep.at(-1),2);
s.silent=false;a.delay(2);assert.equal(JSON.parse(s.getItem(key)).sleepMinutes,2);assert.match(a.feedback(),/enregistrées/);
s.failWrite=true;a.delay(5);assert.equal(JSON.parse(s.getItem(key)).sleepMinutes,2);assert.match(a.feedback(),/indisponible/);
s=memory(JSON.stringify(defaults));s.failRead=true;a=fixture(s);a.delay(1);a.node('display-reset').click();
assert.equal(s.writeCount,0);assert.match(a.feedback(),/indisponible/);assert.equal(s.values.get(key),JSON.stringify(defaults));
// Clock preference: stored as a boolean, applied as a body class, rejected when malformed.
{const cs=memory(),c=fixture(cs);assert.equal(c.node('display-clock-state').textContent,'Affichée');assert(!c.classes.has('display-hide-clock'));
 c.node('display-clock-toggle').click();assert.equal(JSON.parse(cs.getItem(key)).clock,false);assert(c.classes.has('display-hide-clock'));assert.equal(c.node('display-clock-state').textContent,'Masquée');
 assert(fixture(cs).classes.has('display-hide-clock'),'restored hidden');
 const bad=fixture(memory(JSON.stringify({clock:'yes'})));assert.match(bad.feedback(),/illisibles/);assert(!bad.classes.has('display-hide-clock'));}
console.log('PASS: display preference persistence/readback, stale tabs, explicit reset, corrupt/future/partial settings, quota/permission/silent failures; no network or controller API.');
