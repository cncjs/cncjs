'use strict';
const assert=require('assert').strict;
const diagram=require('./touch/probe-diagram');
const corners={'--':[70,125],'+-':[210,125],'-+':[70,50],'++':[210,50]};
for(const corner of Object.keys(corners)){
 for(const x of [-1,1])for(const y of [-1,1]){
  const p={corner,directionX:x,directionY:y,thickness:12.5},d=diagram.describe(p,'XYZ',6);
  assert.deepEqual([d.cx,d.cy],corners[corner]);assert(d.edgeX.includes(String(d.cx)));assert(d.edgeY.includes(String(d.cy)));
  assert(d.arrowX.includes(x===1?'H195':'H85'));assert(d.arrowY.includes(y===1?'V65':'V115'));assert(d.z);
  assert.equal(d.thickness,'Épaisseur : 12,5 mm');assert.equal(d.tool,'Outil Ø : 6 mm');
  for(const op of ['X','Y','Z']){
   const single=diagram.describe(p,op,6);
   assert.equal(!!single.arrowX,op==='X');assert.equal(!!single.arrowY,op==='Y');assert.equal(single.z,op==='Z');
   assert.equal(!!single.edgeX,op==='X');assert.equal(!!single.edgeY,op==='Y');
  }
 }
}
for(const p of [{},{corner:'north',directionX:0,directionY:'1',thickness:-1},{corner:'<script>',thickness:Infinity}]){
 const d=diagram.describe(p,'XYZ',NaN);assert.equal(d.corner,null);assert.equal(d.cx,null);assert.equal(d.cy,null);
 assert.equal(d.arrowX,'');assert.equal(d.arrowY,'');assert(d.thickness.includes('renseigner'));assert(d.tool.includes('renseigner'));
 assert(!d.description.includes('<script>'));
}
assert.equal(diagram.describe({corner:'--',directionX:1,directionY:1},'unknown',6).arrowX,'');
// Repeated job/progress renders must not redraw an unchanged diagram.
let writes=0;const nodes={};
function node(){return {setAttribute(){writes++;},set textContent(v){writes++;}};}
const host={set innerHTML(v){writes++;},querySelector(s){return nodes[s]||(nodes[s]=node());}};
const view=diagram.attach(host),profile={corner:'--',directionX:1,directionY:1,thickness:10};
assert.equal(view.update(profile,'XYZ',6),true);const baseline=writes;
for(let i=0;i<100;i++)assert.equal(view.update({...profile,name:'Autre nom',fast:i},'XYZ',6),false);
assert.equal(writes,baseline);
assert.equal(view.update({...profile,corner:'++'},'XYZ',6),true);
assert.equal(view.update({...profile,corner:'++'},'Z',6),true);
assert.equal(view.update({...profile,corner:'++'},'Z',8),true);
assert.deepEqual(profile,{corner:'--',directionX:1,directionY:1,thickness:10});
console.log('PASS: diagram four corners/all XY signs/operations, unknown values, labels, immutable inputs, zero DOM redraw on 100 unchanged updates; no trajectory or commands.');
