'use strict';
// The DOM fixture must keep every listener of an event, like a browser: a module
// that adds a second listener must not silently replace the first one.
const assert=require('assert').strict;
const {createDOM}=require('./dom-fixture.cjs');
const {document,node}=createDOM();
for(const target of [node('button'),document]){
  const calls=[];
  const a=function(e){calls.push(['a',this,e]);},b=function(e){calls.push(['b',this,e]);};
  target.addEventListener('click',a);target.addEventListener('click',b);target.addEventListener('click',a);
  target.handlers.click('event');
  assert.deepEqual(calls.map(c=>c[0]),['a','b'],'both listeners run, in order, a duplicate once');
  assert.deepEqual(calls.map(c=>c[2]),['event','event']);
  calls.length=0;target.removeEventListener('click',a);target.handlers.click();
  assert.deepEqual(calls.map(c=>c[0]),['b'],'removing one keeps the other');
  target.removeEventListener('click',b);
  assert.equal(Object.keys(target.handlers).length,0,'no listener left: no handler entry');
}
// element.click() runs every listener with the element as `this`.
const el=node('submit'),seen=[];el.addEventListener('click',function(){seen.push(this);});el.addEventListener('click',function(){seen.push(this);});
el.click();assert.equal(seen.length,2);assert(seen.every(s=>s===el));
console.log('PASS dom fixture: every listener kept, ordered, deduplicated, removable one by one.');
