const assert = require('node:assert/strict');
const {scan}=require('./touch/library-preview');
async function points(code){const p=[];const result=await scan(code,(x,y,xx,yy,m)=>{if(m===2||m===3)p.push([xx,yy]);});return {p,result};}
(async()=>{
 let a=await points('G17 G21 G90\nG0 X10 Y0\nG3 X0 Y10 I-10 J0');
 assert(a.p.length>10);assert(a.p.every(p=>p[0]>=-1e-8&&p[1]>=-1e-8));assert.deepEqual(a.p.at(-1),[0,10]);
 a=await points('G0 X10 Y0\nG2 X0 Y-10 I-10 J0');assert(a.p.every(p=>p[0]>=-1e-8&&p[1]<=1e-8));
 a=await points('G0 X10 Y0\nG3 X10 Y0 I-10');assert(a.p.length>=72);assert.deepEqual(a.p.at(-1),[10,0]);assert(a.result.bounds[0]<-9.99);
 let minor=await points('G0 X0 Y0\nG3 X10 Y0 R10');let major=await points('G0 X0 Y0\nG3 X10 Y0 R-10');assert(major.p.length>minor.p.length*3);assert(minor.p.some(p=>p[1]<-1));
 await assert.rejects(scan('G0 X10 Y0\nG90.1\nG3 X0 Y10 I0 J0'),/G90.1/); // refused by Grbl 1.1
 a=await points('G0 X10 Y0\nG91\nG3 X-10 Y10 I-10 J0');assert.deepEqual(a.p.at(-1),[0,10]);
 a=await points('G20 G0 X1 Y0\nG3 X0 Y1 I-1');assert.deepEqual(a.p.at(-1),[0,25.4]);
 a=await points('G0 X10 Y0\nG3 X0 Y10 Z-3 I-10 J0');assert.deepEqual(a.p.at(-1),[0,10]);
 await assert.rejects(scan('G2 X10 R1'),/rayon/);
 await assert.rejects(scan('G2 X10 I1'),/centre/);
 await assert.rejects(scan('G2 X10'),/sans centre/);
 await assert.rejects(scan('G2 X10 I5 R5'),/simultanés/);
 await assert.rejects(scan('G18 G2 X10 I5 K0'),/G18/);
 await assert.rejects(scan('G1 X10 I5'),/hors mode/);
 await assert.rejects(scan('G0 X10 Y0\nG3 I-10'),/arc sans X ni Y/); // Grbl error 26: a full circle needs its end point
 console.log('Arc tests passed: CW/CCW, complete circle, radius +/- , absolute/relative centres/endpoints, inches, helical XY projection, invalid arcs.');
})().catch(e=>{console.error(e);process.exitCode=1;});
