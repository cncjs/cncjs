'use strict';
// Tool marker during a job (reports 4 times a second): the image box is read at most
// once a second (each read forces a layout on the tablet) and at once after a screen
// change, a resize or a new image; the marker moves with a transform, at the place
// the left/top formula gave before. Synthetic DOM, no browser.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let now=1e6,reads=0;const frames=[],handlers={};
function el(tag){return {tagName:tag,style:{},hidden:false,attributes:{},children:[],textContent:'',
  setAttribute(k,v){this.attributes[k]=v;},appendChild(c){this.children.push(c);c.parentNode=this;return c;},
  addEventListener(n,f){(this.handlers=this.handlers||{})[n]=f;},insertAdjacentElement(){} };}
const parent=el('div');parent.getBoundingClientRect=()=>({left:100,top:50,width:500,height:300});
const img=el('img');img.id='home-job-image';parent.appendChild(img);img.offsetWidth=400;
// viewport-fit scale 0.8: screen rects are 0.8 x the layout size.
img.getBoundingClientRect=()=>{reads++;return {left:100+0.8*20,top:50+0.8*10,width:0.8*400,height:0.8*225};};
const screen=el('section');screen.classList={contains:n=>n==='active'};
const note=el('p');
const document={hidden:false,getElementById:id=>id==='home-job-image'?img:id==='screen-home'?screen:note,
  createElement:el,createElementNS:(ns,tag)=>el(tag),addEventListener(){}};
const root={addEventListener:(n,f)=>handlers[n]=f};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/tool-position.js','utf8'),{window:root,document,Date:{now:()=>now},
  requestAnimationFrame:f=>{frames.push(f);return frames.length;},cancelAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},Number,Math,Array,isFinite});
const marker=parent.children.find(c=>c.className==='tool-position-marker');
img.cncPreview={file:'a.nc',projection:{version:1,width:960,height:540,units:'mm',wcs:'G54',bounds:[0,0,100,50]}};
function report(x,y){handlers['cnc-job-status']({detail:{simulation:false,machine:{fresh:true,name:'a.nc',total:100,received:10,workflow:'running',
  operator:{reportUnits:'mm',wcs:'G54'},coordinates:{wpos:{x:String(x),y:String(y)}}}}});while(frames.length)frames.shift()();}
// What the left/top formula gave: box in layout px, image drawn at 960x540 ratio.
function expected(x,y){
  const k=0.8,box={left:20,top:10,width:400,height:225},ratio=Math.min(box.width/960,box.height/540),w=960*ratio,h=540*ratio;
  const b=[0,0,100,50],sx=100,sy=50,scale=Math.min(880/sx,440/sy);
  const px=((960-sx*scale)/2+(x-b[0])*scale)/960,py=(540-(540-sy*scale)/2-(y-b[1])*scale)/540;
  return {left:box.left+(box.width-w)/2+px*w,top:box.top+(box.height-h)/2+py*h};
}
function shown(){const m=/translate\(([-\d.]+)px,([-\d.]+)px\) translate\(-50%,-50%\)/.exec(marker.style.transform);assert(m,'marker moved by a transform: '+marker.style.transform);
  return {left:parseFloat(marker.style.left)+Number(m[1]),top:parseFloat(marker.style.top)+Number(m[2])};}
report(10,10);
assert.equal(marker.hidden,false);
let e=expected(10,10),s=shown();assert(Math.abs(s.left-e.left)<1e-6&&Math.abs(s.top-e.top)<1e-6,'same place as before: '+JSON.stringify([s,e]));
const left=marker.style.left;reads=0;
for(let i=1;i<=8;i++){now+=250;report(10+i,10+i/2);}
assert(reads<=2,'image box read at most once a second, not at every report: '+reads);
assert.equal(marker.style.left,left,'left/top stay put while the tool moves');
e=expected(18,14);s=shown();assert(Math.abs(s.left-e.left)<1e-6&&Math.abs(s.top-e.top)<1e-6);
// A screen change or a resize reads the box again at once.
reads=0;handlers['cnc-screen-change']();while(frames.length)frames.shift()();assert.equal(reads,1);
reads=0;handlers.resize();while(frames.length)frames.shift()();assert.equal(reads,1);
console.log('PASS tool position: box read at most once a second, marker moved by transform at the same place, re-read after screen change and resize.');
