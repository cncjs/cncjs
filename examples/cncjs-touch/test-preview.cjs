const assert = require('node:assert/strict');
const {scan, render} = require('./touch/library-preview.js');
(async () => {
  // Grbl executes lines after M2/M30 and the CNCjs sender sends them: refused, never hidden.
  await assert.rejects(scan('G21 G90\nG1 X10 Y10 F100\nM30\nG0 X300 Y300'), /après M2\/M30/);
  // CNCjs '%' directives: the server refuses any '%' line with more than spaces after it.
  for (const line of ['% (fin)', '%;fin', '%wait', ' %X=1']) await assert.rejects(scan('G21 G90\nG1 X1 F100\n' + line + '\nM30'), /directive/, line);
  await scan('G21 G90\nG1 X1 F100\nM30\n%\n % \n\n');
  // A tool change (CNCjs comments M6 out and pauses) does not move: the preview accepts it.
  assert.equal((await scan('G21 G90\nT1 M6\nM3 S9000\nG0 X0 Y0\nG1 X10 F300\nT2 M6\nG1 Y10\nM30')).lines, 8);
  // Relative moves before any absolute X/Y start from the tool's place: flagged for the travel check.
  assert.equal((await scan('G21 G91\nG1 X100 F500\nG1 Y50\nG1 X-100\nM2')).relativeStart, true);
  assert.equal((await scan('G21 G90\nG0 X0 Y0\nG91\nG1 X10 F300\nM2')).relativeStart, false);
  let result = await scan('G21 G90\nG0 X10 Y10\nG1 X30 Y20 F200\nG91\nX-5 Y5\nM2\n%\n\n');
  assert.equal(result.count, 3);
  assert.deepEqual(result.bounds, [0,0,30,25]);
  // Progress trail: [sentLines, x, y, ...] samples, sent lines counted like the CNCjs sender (non-empty).
  assert.equal(result.lines, 7, 'every non-empty line is counted, as the sender sends them (the % after M2 too)');
  assert.equal(result.trail.length % 3, 0); assert(result.trail.length >= 6);
  assert.deepEqual(result.trail.slice(-3), [7, 25, 25], 'last sample: final sent line and position');
  for (let i = 3; i < result.trail.length; i += 3) assert(result.trail[i] >= result.trail[i - 3], 'line counts are monotonic');
  const sparse = await scan('\n\n  \nG1 X1\n\n;comment only\n(paren)\nG1 X2\n');
  assert.equal(sparse.lines, 4, 'comment-only lines count as sent lines, blank lines do not');
  result = await scan('G20 G90\r\nG1 X1 Y2\r\n');
  assert.deepEqual(result.bounds, [0,0,25.4,50.8]);
  await assert.rejects(scan('G1 X1\nG2 X2 I1'), /centre/);
  await assert.rejects(scan('G1 X1 X2'), /axe répété/);
  await assert.rejects(scan('G1 X1 (oops'), /commentaire/);
  // An unclosed comment must not hide the following lines (Grbl ends it at the line end).
  await assert.rejects(scan('G1 X10 Y10 F100 (oops\nG0 X200 Y200 (end)\nG1 X20 Y10'), /Ligne 1 : commentaire/);
  await assert.rejects(scan('G90.1\nG2 X10 Y0 I5 J0'), /G90.1/);
  await assert.rejects(scan('G1 X10 F100\nG2 I-5'), /arc sans X ni Y/);
  await assert.rejects(scan('G1 X10 F100\nG2 Z-1 I-5'), /arc sans X ni Y/);
  await assert.rejects(scan('G1 X1 F100\rG1 X2'), /CR seule/);
  // An arc ending a hair short of its start is a full circle for Grbl.
  result = await scan('G21 G90\nG0 X10 Y0\nG2 X10 Y0.0000000001 I-10 J0 F100');
  assert(result.bounds[0] < -9.9 && result.bounds[2] > 9.9, 'full circle drawn: ' + result.bounds);
  await assert.rejects(scan('G90 G91 G1 X1'), /contradictoires/);
  await assert.rejects(scan('X2'), /mode G0/);
  await assert.rejects(scan('G1 X1',null,()=>true), /Annulé/);
  // G4 dwell (spindle spin-up after M3) is accepted without motion; P alone or G4 with axes is not.
  result = await scan('G21 G90\nM3 S12000\nG4 P2\nG1 X10 Y0 F600\nG4P0.5\nM5');
  assert.equal(result.count, 1); assert.deepEqual(result.bounds, [0,0,10,0]); assert.equal(result.lines, 6);
  await assert.rejects(scan('G1 X1 P2'), /P hors G4/);
  await assert.rejects(scan('G4 X1 P1'), /G4 attend seulement P/);
  await assert.rejects(scan('G4'), /G4 attend seulement P/);
  await assert.rejects(scan('G4 P1 P2'), /P répété/);
  let count=0;
  const big = 'G90 G21\nG1 X1\n' + Array.from({length:120001},(_,i)=>'X'+(i%2 ? 1 : 2)).join('\n');
  result = await scan(big,()=>count++);
  assert.equal(result.count,120002); assert.equal(count,120002);
  assert(result.trail.length/3 <= 1005 && result.trail.length/3 >= 900, 'about a thousand samples: ' + result.trail.length/3);
  assert.deepEqual(result.trail.slice(0, 3), [0, 0, 0], 'the trail starts at the program origin');
  assert.equal(result.trail.at(-3), 120003); assert.equal(result.lines, 120003);
  const { trailCount } = require('./touch/tool-position.js');
  assert.equal(trailCount(result.trail, 0), 1); assert.equal(trailCount(result.trail, 120003), result.trail.length/3);
  assert(trailCount(result.trail, 60000) > 400 && trailCount(result.trail, 60000) < 600);
  let strokes=0;
  const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++;}};
  const canvas={getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,AAAA'};
  result = await render(big,canvas,()=>false,()=>{});
  assert.equal(strokes,120002); assert.equal(result.segments,120002);
  assert.equal(result.lines, 120003); assert(Array.isArray(result.trail) && result.trail.length >= 3000, 'render carries the trail');
  console.log('Preview tests: 10 checks passed, including 120002 segments with no omissions.');
})().catch(e=>{console.error(e);process.exitCode=1;});
