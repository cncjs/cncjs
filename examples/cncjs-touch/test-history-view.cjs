const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {document,node,activeScreens,stats}=require('./dom-fixture.cjs').createDOM([]),handlers={};
const window={addEventListener:(name,fn)=>handlers[name]=fn};
vm.runInNewContext(fs.readFileSync(__dirname+'/touch/simulation-history.js','utf8'),{document,window,Date});
const emit=history=>handlers['cnc-job-status']({detail:{simulation:true,machine:{history}}});
const event=id=>({id,time:Date.UTC(2026,9,14,12,0,id),message:'Événement '+id,file:'demo.nc',percent:id});
const initial=[event(4),event(3),event(2),event(1)];emit(initial);assert.equal(stats.writes,0);
activeScreens.add('history');handlers['cnc-screen-change']({detail:'history'});
const rows=node('sim-history-list').children.slice(),writes=stats.writes;
for(let i=0;i<30;i++)emit(initial.map(e=>({...e})));assert.equal(stats.writes,writes);
node('sim-history-next').focus();emit([event(5),...initial]);
assert.strictEqual(node('sim-history-list').children[1],rows[0]);assert.strictEqual(document.activeElement,node('sim-history-next'));
// Same length/id but amended content is not lost by a first-id-only signature.
emit([event(5),{...initial[0],message:'Précision reçue'},...initial.slice(1)]);
assert.equal(node('sim-history-list').children[1]._title.textContent.endsWith('Précision reçue'),true);
document.hidden=true;const hidden=stats.writes;emit([event(6),event(5),...initial]);assert.equal(stats.writes,hidden);
document.hidden=false;document.handlers.visibilitychange();assert.match(node('sim-history-list').children[0]._title.textContent,/Événement 6/);
activeScreens.clear();handlers['cnc-screen-change']({detail:'menu'});const hiddenAgain=stats.writes;
emit(Array.from({length:220},(_,i)=>event(300-i)));assert.equal(stats.writes,hiddenAgain);
activeScreens.add('history');handlers['cnc-screen-change']({detail:'history'});assert.match(node('sim-history-page').textContent,/200 événements/);
// The Errors filter finds rejected actions in any language (their message is translated).
{
 const f=require('./dom-fixture.cjs').createDOM(['history']),h={};
 const errorsButton=f.element('button');errorsButton.setAttribute('data-history-filter','errors');
 f.document.querySelectorAll=sel=>sel==='[data-history-filter]'?[errorsButton]:[];
 vm.runInNewContext(fs.readFileSync(__dirname+'/touch/simulation-history.js','utf8'),{document:f.document,window:{addEventListener:(n,fn)=>h[n]=fn},Date});
 h['cnc-job-status']({detail:{simulation:true,machine:{history:[{id:2,time:Date.UTC(2026,9,14),action:'rejected',message:'Action rejected: X axis out of range'},{id:1,time:Date.UTC(2026,9,14),action:'jog',message:'Move X : 1 mm.'}]}}});
 errorsButton.handlers.click();
 assert.match(f.node('sim-history-page').textContent,/1 /,'one error in English: '+f.node('sim-history-page').textContent);
}
console.log('PASS: journal view keyed identity, no unchanged/hidden paint, amended event, focus, immediate return and bounded display.');
