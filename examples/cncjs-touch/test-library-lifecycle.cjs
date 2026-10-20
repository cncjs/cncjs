const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const {document,node,activeScreens,stats}=require('./dom-fixture.cjs').createDOM([]),handlers={},pending=[],events=[];
 const ctx={document,window:{addEventListener:(n,f)=>handlers[n]=f,dispatchEvent:e=>events.push(e)},CustomEvent:function(type,options){this.type=type;this.detail=options.detail;},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'test'}}})},XMLHttpRequest:function(){
  this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=()=>{};
  this.send=body=>{this.body=body;pending.push(this);};
  this.abort=()=>{this.aborted=true;if(this.onabort)this.onabort();};
 }};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/shared-library.js','utf8'),ctx);
 const flush=()=>new Promise(setImmediate),reply=(xhr,value)=>{xhr.status=200;xhr.responseText=JSON.stringify(value);xhr.onload();};
 const navigate=name=>{activeScreens.clear();activeScreens.add(name);handlers['cnc-screen-change']({detail:name});};
 const files=mtime=>({files:[{type:'f',name:'a.nc',size:100,mtime},{type:'f',name:'b.nc',size:100,mtime:'2026-10-13'}]});
 const metadata=file=>({data:JSON.stringify({version:1,file,originalName:file,preview:{image:'data:image/png;base64,AA==',bounds:[0,0,10,10]}})});
 assert.equal(pending.length,0,'hidden startup does not request library');
 navigate('files');const first=pending.shift();reply(first,{configured:true});await flush();const stale=pending.shift();
 navigate('menu');assert(stale.aborted);const hiddenWrites=stats.writes;
 reply(stale,files('2026-10-15'));await flush();assert.equal(stats.writes,hiddenWrites);assert.equal(ctx.window.cncLibrarySelection,undefined);
 navigate('files');reply(pending.shift(),{configured:true});await flush();reply(pending.shift(),files('2026-10-14'));await flush();
 const image=pending.shift();reply(image,metadata('a.nc'));await flush();
 // Leaving between the HTTP result and image decoding must allow a retry.
 const oldImageLoad=node('library-image').onload;navigate('menu');const noPaint=stats.writes;oldImageLoad();assert.equal(stats.writes,noPaint);
 navigate('files');reply(pending.shift(),{configured:true});await flush();reply(pending.shift(),files('2026-10-14'));await flush();
 assert.equal(pending.length,1);reply(pending.shift(),metadata('a.nc'));await flush();node('library-image').onload();
 const a=node('library-list').children[0],b=node('library-list').children[1];b.focus();
 node('library-refresh').handlers.click();node('library-refresh').handlers.click();
 reply(pending.shift(),{configured:true});await flush();reply(pending.shift(),files('2026-10-12'));await flush();
 assert.strictEqual(node('library-list').children[0],b);assert.strictEqual(node('library-list').children[1],a);assert.strictEqual(document.activeElement,b,'reorder restores focus on retained button');
 // One second refresh is queued rather than silently dropping an action while busy.
 assert.equal(pending.filter(x=>x.url.endsWith('/status')).length,1);
 const detail=pending.find(x=>x.url.endsWith('/file'));if(detail){pending.splice(pending.indexOf(detail),1);reply(detail,metadata('a.nc'));await flush();node('library-image').onload();}
 reply(pending.shift(),{configured:true});await flush();reply(pending.shift(),files('2026-10-12'));await flush();
 assert(events.some(e=>e.type==='cnc-library-preview-updated'&&e.detail.file==='a.nc'));
 console.log('PASS: hidden startup, abort/stale list, image-decode reentry, keyed reorder/focus and coalesced refresh actions.');
})().catch(e=>{console.error(e);process.exitCode=1;});
