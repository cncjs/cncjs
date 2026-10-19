const fs=require('fs'),vm=require('vm'),assert=require('assert');
function setup(file){
 let writes=0,scheduled=0,active,content=380;
 const handlers={},observers=[],queue=[];
 const screen={nodeType:1,style:new Proxy({},{set(o,k,v){writes++;o[k]=v;return true;}}),classList:{contains:k=>k==='screen'||k==='active'&&active===screen},get scrollWidth(){return parseFloat(this.style.width)||1200},get scrollHeight(){return content}};
 const hidden={nodeType:1,classList:{contains:k=>k==='screen'},parentElement:null};
 active=screen;
 const main={style:{},clientWidth:1280,clientHeight:650,scrollTop:0,scrollLeft:0,querySelector:()=>active};
 screen.parentElement=hidden.parentElement=main;
 const body={classList:{contains:k=>k==='ks-ui'}};
 const ctx={window:{innerWidth:1366,innerHeight:768,addEventListener:(n,f)=>handlers['w:'+n]=f},document:{body,querySelector:()=>main,getElementById:()=>null,documentElement:{style:{setProperty(){}}},addEventListener:(n,f)=>handlers['d:'+n]=f},requestAnimationFrame:f=>{scheduled++;queue.push(f)},MutationObserver:function(f){this.observe=()=>{};observers.push(f)}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
 function flush(){while(queue.length)queue.shift()();}
 flush();writes=0;scheduled=0;
 return {handlers,observers,screen,hidden,flush,get writes(){return writes},get scheduled(){return scheduled},grow(){content=850},resize(value){content=value}};
}
const before=fs.existsSync(__dirname+'/viewport-fit-before.js')?setup(__dirname+'/viewport-fit-before.js'):null,after=setup(__dirname+'/touch/viewport-fit.js');
for(let i=0;i<20;i++){for(const f of [before,after].filter(Boolean)){f.handlers['d:click']();f.flush();}}
assert.equal(after.writes,0);if(before)assert(before.writes>0);
after.observers[0]([{target:after.hidden}]);assert.equal(after.scheduled,20);
after.grow();after.observers[0]([{target:after.screen}]);after.flush();assert(after.writes>0);
// Growth on a shown screen shrinks it in place: never hidden, never reset to scale 1.
assert.notEqual(after.screen.style.visibility,'hidden','overflow refit must not hide a shown screen');
assert.match(after.screen.style.transform,/^scale\(/);
// Content that changes but still fits at the current scale must not be re-measured (no blink).
const settled=after.writes;after.resize(800);after.observers[0]([{target:after.screen}]);after.flush();
assert.equal(after.writes,settled,'fitting content change: no style writes');assert.equal(after.screen.style.visibility,'');
after.resize(300);after.observers[0]([{target:after.screen}]);after.flush();assert.equal(after.writes,settled,'shrinking content: no style writes while shown');
// Re-opening the screen re-measures and lets it grow back.
after.handlers['w:cnc-screen-change']();after.flush();assert(after.writes>settled,'activation re-measures');
console.log('PASS 20 unchanged revisits: screen layout writes before='+(before?before.writes:'not measured')+', after=0. Hidden changes schedule no fit; content growth triggers refit.');
