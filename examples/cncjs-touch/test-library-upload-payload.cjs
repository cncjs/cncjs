const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const {document,node,activeScreens}=require('./dom-fixture.cjs').createDOM(['files']),handlers={},encodings=[],puts=[],emitted=[];
 const window={addEventListener:(n,f)=>handlers[n]=f,dispatchEvent:e=>emitted.push(e),
  CNCLibraryPreview:{render:()=>Promise.resolve({image:'data:image/png;base64,AA==',bounds:[0,0,1,1]})},
  CNCLibraryPayload:{encodeFile(file,text,cancelled,progress){progress('Préparation JSON…');return new Promise(resolve=>encodings.push({file,text,cancelled,resolve}));}}
 };
 const ctx={document,window,Blob,CustomEvent:function(type,o){this.type=type;this.detail=o.detail;},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'fake'}}})},
  FileReader:function(){this.readAsText=()=>{this.result='G0 X0\nG1 X1';Promise.resolve().then(()=>this.onload());};},
  XMLHttpRequest:function(){this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=()=>{};this.send=body=>{if(this.method==='PUT')puts.push({url:this.url,body});this.status=200;this.responseText=JSON.stringify(this.url.endsWith('/status')?{configured:true}:this.url.endsWith('/files')?{files:[]}:{});Promise.resolve().then(()=>this.onload());};}
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/shared-library.js','utf8'),ctx);
 const flush=()=>new Promise(setImmediate);await flush();
 node('library-input').files=[{name:'pièce.nc',size:14}];node('library-send').handlers.click();await flush();
 assert.equal(encodings.length,1);assert.equal(node('library-cancel').hidden,false);assert.equal(puts.length,0);
 const cancelled=encodings.shift();node('library-cancel').handlers.click();assert(cancelled.cancelled());cancelled.resolve(new Blob(['{}']));await flush();assert.equal(puts.length,0);
 node('library-send').handlers.click();await flush();const prepared=encodings.shift();assert.equal(prepared.text,'G0 X0\nG1 X1');
 activeScreens.clear();activeScreens.add('home');handlers['cnc-screen-change']({detail:'home'});
 const payload=new Blob([JSON.stringify({file:prepared.file,data:prepared.text})],{type:'application/json'});prepared.resolve(payload);await flush();
 assert.equal(puts.length,2);assert.strictEqual(puts[0].body,payload);assert.equal(JSON.parse(await puts[0].body.text()).data,prepared.text);
 assert.equal(node('library-cancel').hidden,true);assert.equal(window.cncLibrarySelection.file,prepared.file);assert.equal(window.cncLibrarySelection.name,'pièce.nc');
 assert(emitted.some(e=>e.type==='cnc-library-preview-updated'&&e.detail.file===prepared.file));
 console.log('PASS: cancellable payload preparation, Blob upload without stringify, preserved Unicode/global selection while hidden and preview invalidation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
