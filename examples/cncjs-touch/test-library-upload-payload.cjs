const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 let listed=[],offset=0;
 class FakeDate extends Date { static now(){ return Date.now()+offset; } }
 const {document,node,activeScreens}=require('./dom-fixture.cjs').createDOM(['files']),handlers={},encodings=[],puts=[],emitted=[],reads=[];
 const window={addEventListener:(n,f)=>handlers[n]=f,dispatchEvent:e=>emitted.push(e),
  CNCLibraryPreview:{render:()=>Promise.resolve({image:'data:image/png;base64,AA==',bounds:[0,0,1,1]})},
  CNCLibraryPayload:{encodeFile(file,text,cancelled,progress){progress('Préparation JSON…');return new Promise(resolve=>encodings.push({file,text,cancelled,resolve}));}}
 };
 const ctx={document,window,Blob,Date:FakeDate,setTimeout:()=>0,CustomEvent:function(type,o){this.type=type;this.detail=o.detail;},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'fake'}}})},
  // A file flagged latin1 holds Windows-1252 bytes: read as UTF-8, its accents become U+FFFD.
  FileReader:function(){this.readAsText=(file,encoding)=>{reads.push(encoding||'utf-8');this.result=file.latin1?(encoding==='windows-1252'?'G0 X0 (pièce)':'G0 X0 (pi�ce)'):file.genuine?(encoding==='windows-1252'?'G0 X0 (ï¿½)':'G0 X0 (�)'):'G0 X0\nG1 X1';Promise.resolve().then(()=>this.onload());};},
  XMLHttpRequest:function(){this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=()=>{};this.send=body=>{if(this.method==='PUT')puts.push({url:this.url,body});this.status=200;this.responseText=JSON.stringify(this.url.endsWith('/status')?{configured:true}:this.url.endsWith('/files')?{files:listed}:{});Promise.resolve().then(()=>this.onload());};}
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
 // CNCjs lists the new file a few seconds later: an older file must not take the selection meanwhile.
 listed=[{name:'ancien.nc',type:'f',size:10,mtime:'2026-10-01T00:00:00Z'}];
 activeScreens.clear();activeScreens.add('files');handlers['cnc-screen-change']({detail:'files'});await flush();await flush();
 assert.equal(window.cncLibrarySelection.file,prepared.file,'the uploaded file stays selected until it is listed');
 listed=[{name:prepared.file,type:'f',size:14,mtime:'2026-10-17T00:00:00Z'},listed[0]];
 node('library-refresh').handlers.click();await flush();await flush();
 assert.equal(window.cncLibrarySelection.file,prepared.file);
 // A Latin-1 (Windows-1252) file is read again in that encoding instead of losing its accents.
 reads.length=0;node('library-input').files=[{name:'latin.nc',size:14,latin1:true}];node('library-send').handlers.click();await flush();await flush();
 const latin=encodings.shift();assert.equal(latin.text,'G0 X0 (pièce)','accents kept');assert.deepEqual(reads,['utf-8','windows-1252']);
 latin.resolve(new Blob([JSON.stringify({file:latin.file,data:latin.text})]));for(let i=0;i<5;i++)await flush();
 assert.match(node('library-upload-status').textContent,/Windows-1252/,'the operator is told the file was converted');
 // A UTF-8 file is read once.
 reads.length=0;node('library-input').files=[{name:'utf8.nc',size:14}];node('library-send').handlers.click();await flush();assert.deepEqual(reads,['utf-8']);
 encodings.shift().resolve(new Blob(['{}']));for(let i=0;i<5;i++)await flush();
 // A valid UTF-8 file that really contains U+FFFD keeps its UTF-8 text.
 node('library-input').files=[{name:'vrai.nc',size:14,genuine:true}];node('library-send').handlers.click();await flush();await flush();
 const genuine=encodings.shift();assert.equal(genuine.text,'G0 X0 (�)');
 genuine.resolve(new Blob(['{}']));for(let i=0;i<5;i++)await flush();
 assert.doesNotMatch(node('library-upload-status').textContent,/Windows-1252/);
 // An upload CNCjs still does not list 15 s later is never replaced by another file.
 node('library-input').files=[{name:'lent.nc',size:14}];node('library-send').handlers.click();await flush();
 const slow=encodings.shift();slow.resolve(new Blob(['{}']));for(let i=0;i<5;i++)await flush();
 assert.equal(window.cncLibrarySelection.name,'lent.nc');
 listed=[{name:'ancien.nc',type:'f',size:10,mtime:'2026-10-01T00:00:00Z'}];offset+=16000;
 node('library-refresh').handlers.click();await flush();await flush();
 assert.notEqual(window.cncLibrarySelection&&window.cncLibrarySelection.file,'ancien.nc','no other file selected in its place');
 console.log('PASS: cancellable payload preparation, Blob upload without stringify, preserved Unicode/global selection while hidden, kept until CNCjs lists the upload, and preview invalidation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
