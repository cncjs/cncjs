'use strict';
// Off-machine check before a start: program XY extent placed at the current work
// offset, against Grbl's machine space after homing ([-$13x, 0], or [0, $13x]
// for an axis with its $23 bit set). Unknown whenever it cannot be trusted.
const assert=require('assert').strict;
const {check}=require('./touch/travel-check');
const preview=(b)=>({projection:{version:1,units:'mm',wcs:'G54',bounds:b}});
const machine=(mx,my,extra={})=>({operator:{reportUnits:'mm'},settings:{$22:'1',$23:'0',$130:'400.000',$131:'300.000',...extra},
  coordinates:{mpos:{x:String(mx),y:String(my),z:'-5'},wpos:{x:'0.000',y:'0.000',z:'0'}}});
let r=check(preview([0,0,60,70]),machine(-350,-250));
assert.equal(r.state,'ok');assert.deepEqual(r.axes.map(a=>[a.axis,a.min,a.max,a.low,a.high]),[['X',-350,-290,-400,0],['Y',-250,-180,-300,0]]);
assert.match(r.message,/Z non vérifié/);
// Origin too close to the end of X: the program would run past 0.
r=check(preview([0,0,60,70]),machine(-30,-250));
assert.equal(r.state,'outside');assert.match(r.message,/^Hors course machine : X -30,0 → 30,0 mm \(course -400,0 → 0,0\)/);assert.doesNotMatch(r.message,/ Y /);
// Negative program coordinates past -travel.
assert.equal(check(preview([-80,0,10,10]),machine(-350,-250)).state,'outside');
// X homing towards +: machine space [0, 400].
assert.equal(check(preview([0,0,60,70]),machine(30,-250,{$23:'1'})).state,'ok');
assert.equal(check(preview([0,0,60,70]),machine(-30,-250,{$23:'1'})).state,'outside');
// Y bit only ($23=2).
assert.equal(check(preview([0,0,60,70]),machine(-350,10,{$23:'2'})).state,'ok');
// A work offset with G92 or another WCS is just the difference mpos - wpos.
const m=machine(-350,-250);m.coordinates.wpos={x:'10',y:'20',z:'0'};
r=check(preview([0,0,60,70]),m);assert.deepEqual([r.axes[0].min,r.axes[1].min],[-360,-270]);
// Cannot be trusted: no homing, inches, unknown travel or position, no preview.
for(const [p,c,why] of [[preview([0,0,1,1]),machine(-1,-1,{$22:'0'}),/\$22/],[preview([0,0,1,1]),{...machine(-1,-1),operator:{reportUnits:'in'}},/pouces/],
  [preview([0,0,1,1]),machine(-1,-1,{$131:undefined}),/\$131/],[preview([0,0,1,1]),{...machine(-1,-1),coordinates:{mpos:{},wpos:{}}},/position/],
  [null,machine(-1,-1),/aperçu/],[preview([0,0,NaN,1]),machine(-1,-1),/aperçu/],[{projection:{units:'in',bounds:[0,0,1,1]}},machine(-1,-1),/aperçu/]]){
  r=check(p,c);assert.equal(r.state,'unknown');assert.match(r.message,why);
}
// The dialog line: shown with the state as class, hidden for null.
const {show}=require('./touch/travel-check');const line={hidden:true,textContent:'',className:'job-travel'};
show(line,check(preview([0,0,60,70]),machine(-30,-250)));assert.equal(line.hidden,false);assert.equal(line.className,'job-travel outside');assert.match(line.textContent,/^Hors course/);
show(line,null);assert.equal(line.hidden,true);assert.equal(line.textContent,'');assert.equal(line.className,'job-travel');
// Both pages load the two helper modules before the job controls that use them.
for(const name of ['index.html','simulation.html']){
  const html=require('fs').readFileSync(__dirname+'/touch/'+name,'utf8'),at=f=>html.indexOf(f+'?v=');
  for(const f of ['grbl-help.js','travel-check.js'])assert(at(f)>0&&at(f)<at('job-controls.js')&&at(f)<at('job-dashboard.js'),f+' loaded early in '+name);
}
console.log('PASS travel check: XY extent at the work offset against both homing directions, outside detection, and every untrusted case reported unknown.');
