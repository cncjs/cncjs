const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const {document,node,activeScreens,stats}=require('./dom-fixture.cjs').createDOM(['files']);
 const handlers={},calls=[];let time=10000,mtime='a',intervals=0;
 const fakeDate=class extends Date{static now(){return time}};
 const emitted=[];
 const ctx={document,window:{addEventListener:(n,f)=>handlers[n]=f,dispatchEvent:e=>emitted.push(e)},CustomEvent:function(type,options){this.type=type;this.detail=options.detail;},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'test'}}})},Date:fakeDate,setInterval(){intervals++;},XMLHttpRequest:function(){this.open=(method,url)=>{this.url=url};this.setRequestHeader=()=>{};this.send=body=>{calls.push(this.url);this.status=200;let result;if(this.url.endsWith('status'))result={configured:true};else if(this.url.endsWith('files'))result={files:[{name:'test.nc',type:'f',size:100,mtime:'x'},{name:'test.nc.cnctouch.json',type:'f',size:10,mtime}]};else result={data:JSON.stringify({version:1,file:'test.nc',originalName:'test.nc',preview:{image:'data:image/png;base64,AA==',note:'test',segments:2}})};this.responseText=JSON.stringify(result);Promise.resolve().then(()=>this.onload());}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/shared-library.js','utf8'),ctx);
 const flush=()=>new Promise(setImmediate);await flush();node('library-image').onload();
 const previewCount=()=>calls.filter(s=>s.endsWith('/file')).length;
 assert.equal(ctx.window.cncLibrarySelection.file,'test.nc');assert.equal(ctx.window.cncLibrarySelection.name,'test.nc');assert.equal(previewCount(),1);const initial=calls.length;
 for(let i=0;i<20;i++)handlers['cnc-screen-change']({detail:'files'});
 await flush();assert.equal(calls.length,initial);
 const row=node('library-list').children[0];row.focus();
 const navigate=name=>{activeScreens.clear();activeScreens.add(name);handlers['cnc-screen-change']({detail:name});};
 navigate('home');time+=5000;navigate('files');await flush();assert.equal(previewCount(),1);
 assert.strictEqual(node('library-list').children[0],row);assert.strictEqual(document.activeElement,row);
 const writes=stats.writes;navigate('home');document.hidden=true;document.handlers.visibilitychange();document.hidden=false;document.handlers.visibilitychange();await flush();assert.equal(stats.writes,writes);assert.equal(calls.length,initial+2);
 mtime='b';time+=5000;navigate('files');await flush();assert.equal(previewCount(),2);
 assert(emitted.some(e=>e.type==='cnc-library-preview-updated'&&e.detail.file==='test.nc'));
 node('library-refresh').handlers.click();await flush();assert.equal(previewCount(),3);
 assert.equal(intervals,0);
 console.log('PASS: entry/action refresh only, zero library interval, hidden visibility no requests or repaint, retained row/focus, unchanged preview reuse and same-file invalidation.');
})().catch(e=>{console.error(e);process.exitCode=1});

