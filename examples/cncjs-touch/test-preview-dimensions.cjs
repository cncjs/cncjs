const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const {document,node}=require('./dom-fixture.cjs').createDOM(['files']);
 const pending=[];let files=[{name:'a.nc',type:'f',size:100,mtime:'2026-10-14'}];
 const ctx={document,window:{addEventListener(){},dispatchEvent(){}},CustomEvent:function(){},localStorage:{getItem:()=>JSON.stringify({state:{session:{token:'test'}}})},setInterval(){},XMLHttpRequest:function(){this.open=(method,url)=>this.url=url;this.setRequestHeader=()=>{};this.send=()=>{const done=result=>{this.status=200;this.responseText=JSON.stringify(result);this.onload();};if(this.url.endsWith('/file'))pending.push(done);else Promise.resolve().then(()=>done(this.url.endsWith('/files')?{files}:{configured:true}));};}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/shared-library.js','utf8'),ctx);
 const flush=()=>new Promise(setImmediate);
 const reply=(bounds,file='a.nc')=>({data:JSON.stringify({version:1,file,originalName:file,preview:{image:'data:image/png;base64,AA==',bounds}})});
 const value=id=>node('library-dimensions-'+id).textContent;
 const refresh=async()=>{node('library-refresh').handlers.click();await flush();};
 await flush();assert(node('library-dimensions-table').hidden);
 pending.shift()(reply([-12.5,-3,27.5,5]));await flush();
 assert.equal(value('xmin'),'-12,50');assert.equal(value('width'),'40,00');assert.equal(value('height'),'8,00');assert(!node('library-dimensions-table').hidden);
 await refresh();assert(node('library-dimensions-table').hidden);assert.equal(value('width'),'—');
 pending.shift()(reply([0,-0.001,0,10]));await flush();assert.equal(value('ymin'),'0,00');assert.equal(value('width'),'0,00');
 for(const invalid of [undefined,[],[0,1,2],[3,0,2,1],[0,2,1,0],['0',0,1,1],[null,0,1,1],[-1e308,0,1e308,1]]){
   await refresh();pending.shift()(reply(invalid));await flush();assert(node('library-dimensions-table').hidden);assert.equal(value('width'),'—');
 }
 // A delayed response for the previous selection must never restore its dimensions.
 await refresh();const old=pending.shift();files=[{name:'b.nc',type:'f',size:100,mtime:'2026-10-14'}];await refresh();
 pending.shift()(reply([0,0,60,30],'b.nc'));await flush();old(reply([0,0,10,10]));await flush();
 assert.equal(value('width'),'60,00');assert.equal(value('file'),'b.nc');
 await refresh();pending.shift()({data:'bad json'});await flush();assert(node('library-dimensions-table').hidden);assert.equal(value('width'),'—');
 files=[];await refresh();assert.equal(value('file'),'');assert.match(value('status'),/Sélectionnez/);
 // Bounds in an existing preview are millimetres, including rapid paths and interpolated arcs.
 const preview=require('./touch/library-preview.js');
 const inch=await preview.scan('G20 G90\nG0 X1 Y-1\nG1 X2 Y0');assert.deepEqual(inch.bounds,[0,-25.4,50.8,0]);
 const arc=await preview.scan('G21 G90 G17\nG0 X10 Y0\nG3 X10 Y0 I-10 J0');
 assert(Math.abs(arc.bounds[0]+10)<0.02 && Math.abs(arc.bounds[3]-10)<0.02);
 console.log('PASS: saved XY dimensions, negative/zero ranges, invalid or missing metadata, stale response isolation, clearing on selection/removal, inch conversion and arc bounds.');
})().catch(e=>{console.error(e);process.exitCode=1;});
