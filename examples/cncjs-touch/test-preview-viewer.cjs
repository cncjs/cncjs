const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes={},events={},queue=[],background=[];let active=null,stopCalls=0;
function el(id){return {id,style:{},hidden:false,disabled:false,inert:false,complete:true,naturalWidth:1000,naturalHeight:500,clientWidth:1000,clientHeight:600,textContent:'file.nc',src:'data:image/png;base64,AA==',handlers:{},children:[],classList:{add(){},toggle(){}},setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},removeAttribute(k){delete this[k]},addEventListener(k,f){this.handlers[k]=f},appendChild(e){this.children.push(e)},focus(){active=this},setPointerCapture(){},querySelectorAll(){return [node('preview-viewer-close'),node('preview-zoom-in'),node('preview-job-stop')]},click(){if(!this.disabled&&this.handlers.click)this.handlers.click()}}}
function node(id){return nodes[id]||(nodes[id]=el(id))}
['library-image','home-job-image'].forEach(id=>{node(id).parentNode=el('parent')});
background.push(el('main'),el('nav'));background[1].inert=true;
const document={body:{appendChild(e){nodes[e.id]=e}},getElementById:node,createElement:()=>el('created'),querySelectorAll:()=>background,addEventListener:(n,f)=>events['doc:'+n]=f,get activeElement(){return active}};
node('job-stop').handlers.click=()=>stopCalls++;
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/preview-viewer.js','utf8'),{document,window:{addEventListener:(n,f)=>events[n]=f},requestAnimationFrame:f=>queue.push(f),MutationObserver:function(){this.observe=()=>{}},XMLHttpRequest:function(){throw Error('Unexpected network request')}});
const flush=()=>{while(queue.length)queue.shift()()};
node('library-image').handlers.click();flush();assert(!node('preview-viewer').hidden);assert(background.every(e=>e.inert));
for(let i=0;i<12;i++)node('preview-zoom-in').click();flush();assert.equal(node('preview-zoom-level').textContent,'400 %');assert(node('preview-zoom-in').disabled);
const stage=node('preview-viewer-stage');stage.handlers.pointerdown({button:0,pointerId:1,clientX:0,clientY:0});stage.handlers.pointermove({pointerId:1,clientX:99999,clientY:-99999});flush();
assert.match(node('preview-viewer-image').style.transform,/translate\(1500px,-700px\)/);stage.handlers.pointercancel({pointerId:1});
node('preview-zoom-fit').click();flush();assert.match(node('preview-viewer-image').style.transform,/translate\(0px,0px\) scale\(1\)/);
node('preview-job-stop').click();assert.equal(stopCalls,0);
events['cnc-job-status']({detail:{simulation:true,machine:{activeState:'Run',canStop:true}}});node('preview-job-stop').click();assert.equal(stopCalls,1);
node('job-stop').disabled=true;node('preview-job-stop').click();assert.equal(stopCalls,1);
events['cnc-job-status']({detail:{machine:null}});assert(node('preview-job-stop').disabled);
node('preview-viewer-close').click();assert(node('preview-viewer').hidden);assert(!background[0].inert);assert(background[1].inert);assert(!node('preview-viewer-image').src);
node('library-image').hidden=true;node('library-image').handlers.click();assert(node('preview-viewer').hidden);
console.log('PASS: zoom bounded 100–400%, pan bounded, recenter, inert restoration, unavailable preview guard, stop capability/source guards, no network access.');
