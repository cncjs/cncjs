const assert=require('assert').strict,fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'touch/startup.js'),'utf8');
function setup(){
 const classes=new Set(['cnc-loading']),frames=[],timers=new Map(),events={};let menu=true,other=false;
 const boot={hidden:false},message={textContent:''};
 const window={addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]};
 const document={documentElement:{classList:{remove:name=>classes.delete(name)}},body:{classList:{contains:()=>true}},querySelector:sel=>menu?{}:other&&sel==='main .screen.active'?{}:null,getElementById:id=>id==='cnc-boot'?boot:message};
 vm.runInNewContext(source,{window,document,setTimeout:fn=>{timers.set(1,fn);return 1;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>frames.push(fn)});
 return {classes,frames,timers,events,window,boot,message,noMenu:()=>menu=false,otherScreen:()=>{menu=false;other=true;},flush:()=>{while(frames.length)frames.shift()();}};
}
let s=setup();assert(s.classes.has('cnc-loading'));s.window.cncStartup.ready();assert(!s.boot.hidden);s.flush();assert(s.boot.hidden);assert(!s.classes.has('cnc-loading'));assert.equal(s.timers.size,0);assert(!s.events.error);
s=setup();s.events.error({target:{tagName:'SCRIPT'}});s.window.cncStartup.ready();s.flush();assert(!s.boot.hidden);assert(s.classes.has('cnc-loading'));assert(s.message.textContent.includes('incomplet'));
s=setup();s.window.cncStartup.ready();s.events.error({message:'Initialization failed'});s.flush();assert(!s.boot.hidden);
s=setup();s.events.error({target:{tagName:'IMG'}});s.window.cncStartup.ready();s.flush();assert(s.boot.hidden);
s=setup();s.noMenu();s.window.cncStartup.ready();s.flush();assert(!s.boot.hidden);
// Suivi opened by the job follow-up before the reveal (a job started from the PC): not a failure.
s=setup();s.otherScreen();s.window.cncStartup.ready();s.flush();assert(s.boot.hidden,'another active screen is a loaded page');
s=setup();s.timers.get(1)();assert(s.message.textContent.includes('patienter'));s.window.cncStartup.ready();s.flush();assert(s.boot.hidden);
for(const page of ['index.html','simulation.html']){
 const html=fs.readFileSync(path.join(__dirname,'touch',page),'utf8');
 assert(html.includes('class="cnc-loading"'));assert(html.includes('body>:not(#cnc-boot){visibility:hidden!important'));
 assert(html.indexOf('id="cnc-boot"')<html.indexOf('<main>'));
 const scripts=Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g));
 assert(scripts.length>15);assert(scripts[0][1].includes('startup.js'));
 scripts.slice(1).forEach(script=>{assert(/\bdefer\b/.test(script[1]));assert(script[1].includes('src='));assert.equal(script[2].trim(),'');});
 const order=scripts.map(script=>script[1].match(/src="([^"]+)/)[1].split('?')[0]);
 assert(order.indexOf('shared-library.js')<order.indexOf('job-controls.js'));
 assert(order.indexOf('job-controls.js')<order.indexOf('touch-shell.js'));
 assert(order.indexOf('touch-shell.js')<order.indexOf('viewport-fit.js'));
 assert.equal(order[order.length-1],'startup-ready.js');
 if(page==='index.html')assert(order.indexOf('app.js')<order.indexOf('coordinate-display.js'));
}
console.log('PASS startup: hidden legacy UI, ordered deferred dependencies, first layout, retry on failure, slow load recovery.');
