const fs=require('fs'),vm=require('vm'),assert=require('assert');
let now=0,wallOffset=0,nextId=0,modal=false,focusReturns=0;const timers=new Map(),handlers={},docHandlers={};
const main={tagName:'MAIN',inert:false},alreadyInert={tagName:'NAV',inert:true},focus={isConnected:true,focus(){focusReturns++;}};
let overlay;const document={hidden:false,activeElement:focus,body:{children:[main,alreadyInert],appendChild(el){this.children.push(el);}},createElement(){return overlay={tagName:'BUTTON',setAttribute(){},focus(){}};},querySelectorAll(){return [{hidden:!modal,getClientRects:()=>modal?[1]:[]}];},addEventListener(n,f){docHandlers[n]=f;}};
const window={performance:{now:()=>now},addEventListener(n,f){handlers[n]=f;}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/screen-saver.js','utf8'),{document,window,Date:{now:()=>now+wallOffset},setTimeout(fn,ms){const id=++nextId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);}});
function tick(ms){const end=now+ms;for(;;){let item=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;now=item[1].at;timers.delete(item[0]);item[1].fn();}now=end;}
function event(type,data={}){let stopped=false,prevented=false;handlers[type]({type,...data,preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});return {stopped,prevented};}
const api=window.cncScreenSaver;
api.configure(1);tick(59000);assert(overlay.hidden);event('pointerdown',{pointerId:1});tick(1000);assert(overlay.hidden);tick(59000);assert(!overlay.hidden);assert(main.inert);
assert(event('pointerdown',{pointerId:1}).stopped);assert(event('pointerup',{pointerId:1}).prevented);tick(200);assert(!overlay.hidden);
assert(event('click').stopped);tick(449);assert(!overlay.hidden);tick(1);assert(overlay.hidden);assert(!main.inert);assert(alreadyInert.inert);assert.equal(focusReturns,1);
api.configure(0);tick(3600000);assert(overlay.hidden);assert.equal(timers.size,0);
assert(api.preview());event('touchstart',{touches:[{}]});event('touchend',{touches:[]});tick(450);assert(overlay.hidden);
api.preview();event('keydown',{code:'Space'});tick(1000);assert(!overlay.hidden);event('keyup',{code:'Space'});tick(450);assert(overlay.hidden);
// A second, held press during wake-up must keep shielding the underlying controls.
api.preview();event('pointerdown',{pointerId:1});event('pointerup',{pointerId:1});tick(200);event('pointerdown',{pointerId:2});tick(2000);assert(!overlay.hidden);event('pointerup',{pointerId:2});tick(450);assert(overlay.hidden);
modal=true;api.configure(1);tick(60000);assert(overlay.hidden);assert.equal(api.preview(),false);modal=false;tick(60000);assert(!overlay.hidden);api.configure(0);assert(overlay.hidden);
api.configure(1);document.hidden=true;docHandlers.visibilitychange();tick(120000);assert(overlay.hidden);document.hidden=false;docHandlers.visibilitychange();tick(59999);assert(overlay.hidden);tick(1);assert(!overlay.hidden);
api.configure(123);assert(overlay.hidden);tick(299999);assert(overlay.hidden);tick(1);assert(!overlay.hidden);
// Runtime state changes must inhibit both automatic and manual sleep, without polling.
function job(patch){handlers['cnc-job-status']({detail:{machine:patch===null?null:Object.assign({port:'A',generation:'one',fresh:true,activeState:'Idle',workflow:'idle',canStop:false},patch)}});}
api.configure(1);job({workflow:'running',activeState:'Run',canStop:true});
assert(api.status().blocked);assert.equal(api.preview(),false);assert.equal(timers.size,0);
tick(600000);assert(overlay.hidden);
job({workflow:'paused',activeState:'Hold',canStop:true});assert.match(api.status().reason,/pause/);tick(120000);assert(overlay.hidden);
job({workflow:'paused',activeState:'Alarm',canStop:true});assert.match(api.status().reason,/alarme/);
job(null);assert.match(api.status().reason,/non confirmé/);tick(120000);assert(overlay.hidden);
job({port:'B'});assert(api.status().blocked,'another controller idle does not clear the observed job');
job({generation:'two'});assert(api.status().blocked,'a replaced controller does not clear the observed job');
job({fresh:false});assert(api.status().blocked,'stale Idle cannot clear the observed job');
job({received:100,total:100,workflow:'running',activeState:'Run',canStop:true});assert(api.status().blocked,'100% acknowledged is not idle');
job({workflow:'idle',activeState:'Run',canStop:true});assert(api.status().blocked,'sender idle alone is not controller idle');
job({spindleSpeed:12000});assert(api.status().blocked,'Idle with the spindle on never sleeps');assert.match(api.status().reason,/broche/);job({spindleSpeed:0});
job({});assert(!api.status().blocked);tick(59999);assert(overlay.hidden);tick(1);assert(!overlay.hidden,'full delay starts after confirmed idle');
// A job observed while asleep wakes the display; a held touch still shields controls.
event('pointerdown',{pointerId:8});job({workflow:'running',activeState:'Run',canStop:true});tick(1000);assert(!overlay.hidden);
event('pointerup',{pointerId:8});tick(200);assert(event('click').stopped);tick(450);assert(overlay.hidden);assert(!main.inert);assert(alreadyInert.inert);
job({});api.configure(0);assert(api.preview());job({probeBusy:true});tick(450);assert(overlay.hidden);assert.match(api.status().reason,/palpage/);assert.equal(api.preview(),false);job({});assert(!api.status().blocked);
// Repeated idle snapshots must not postpone inactivity forever.
api.configure(1);for(let i=0;i<60;i++){job({});tick(1000);}assert(!overlay.hidden);api.configure(0);
for(const jump of [-3600000,3600000]){
 api.configure(1);tick(30000);wallOffset+=jump;tick(29999);assert(overlay.hidden);
 tick(1);assert(!overlay.hidden,'Sleep after elapsed inactivity despite a wall-clock correction');api.configure(0);
}
api.configure(1);document.hidden=true;docHandlers.visibilitychange();wallOffset+=86400000;tick(3600000);
assert(overlay.hidden);document.hidden=false;docHandlers.visibilitychange();tick(59999);assert(overlay.hidden);tick(1);assert(!overlay.hidden);api.configure(0);
// The old-browser fallback remains bounded after a backward wall-clock change.
delete window.performance;wallOffset=0;api.configure(1);tick(30000);wallOffset-=3600000;tick(30000);
assert(overlay.hidden);assert.equal(timers.size,1);tick(60000);assert(!overlay.hidden);api.configure(0);
// Sleep/wake announcements for the backlight: once per change, wake on the first touch.
{
  const seen=[],h={};let ov;
  const doc={hidden:false,activeElement:null,body:{children:[],appendChild(el){this.children.push(el);}},createElement(){return ov={tagName:'BUTTON',setAttribute(){},focus(){}};},querySelectorAll(){return [];},addEventListener(){}};
  const win={performance:{now:()=>now},addEventListener(n,f){h[n]=f;},dispatchEvent(e){if(e.type==='cnc-screen-saver-sleep')seen.push(e.detail);}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/touch/screen-saver.js','utf8'),{document:doc,window:win,CustomEvent:function(type,init){this.type=type;this.detail=init.detail;},Date:{now:()=>now},setTimeout(fn,ms){const id=++nextId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);}});
  const fire=(type,data={})=>h[type]({type,...data,preventDefault(){},stopImmediatePropagation(){}});
  win.cncScreenSaver.configure(0);assert(win.cncScreenSaver.preview());assert.deepEqual(seen,[true]);
  fire('touchstart',{touches:[{}]});assert.deepEqual(seen,[true,false],'the panel lights up on the first touch, before release');
  fire('touchend',{touches:[]});tick(450);assert(ov.hidden);assert.deepEqual(seen,[true,false],'no second wake');
  assert(win.cncScreenSaver.preview());win.cncScreenSaver.configure(0);assert.deepEqual(seen,[true,false,true,false],'a configuration change wakes too');
}
console.log('PASS: sleep deadlines, independent clock, visibility return and wake shield; job/pause/alarm/probe inhibition, stale/disconnected/other-controller retention, confirmed-idle reset, automatic wake and no timer during work.');
