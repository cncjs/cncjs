const fs=require('fs'),vm=require('vm'),assert=require('assert');
let now=0,nextId=0,modal=false,focusReturns=0;const timers=new Map(),handlers={},docHandlers={};
const main={tagName:'MAIN',inert:false},alreadyInert={tagName:'NAV',inert:true},focus={isConnected:true,focus(){focusReturns++;}};
let overlay;const document={hidden:false,activeElement:focus,body:{children:[main,alreadyInert],appendChild(el){this.children.push(el);}},createElement(){return overlay={tagName:'BUTTON',setAttribute(){},focus(){}};},querySelectorAll(){return [{hidden:!modal,getClientRects:()=>modal?[1]:[]}];},addEventListener(n,f){docHandlers[n]=f;}};
const window={addEventListener(n,f){handlers[n]=f;}};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/screen-saver.js','utf8'),{document,window,Date:{now:()=>now},setTimeout(fn,ms){const id=++nextId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);}});
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
console.log('PASS: inactivity and activity deadlines, disabled mode, manual preview, touch/keyboard wake, synthetic click shield, held second touch, inert restoration, dialog inhibition and visibility changes.');
