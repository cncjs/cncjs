'use strict';
// Kept screens (Menu, Préparer, Fichiers, Suivi, Machine, Journal): once shown they stay laid out and are parked
// under the active screen. Their parked layout must be the active one, so every rule
// that styles them through .active also lists .kept; modules keep looking at .active only.
const fs=require('fs'),assert=require('assert');
const dir=__dirname+'/touch/';
const kept=['menu','jog','files','home','machine','history'];
const css=fs.readdirSync(dir).filter(f=>f.endsWith('.css'));
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
let checked=0;
css.forEach(file=>{
 const text=strip(fs.readFileSync(dir+file,'utf8'));
 const re=/([^{}]+)\{/g;let m;
 while((m=re.exec(text))){
  const sel=m[1].trim();if(sel.startsWith('@'))continue;
  const parts=sel.split(/,(?![^(]*\))/).map(s=>s.trim());
  parts.forEach(p=>{
   const id=p.match(/#screen-([a-z-]+)\.active\b/);
   const generic=/(^|[\s>])\.screen\.active\b/.test(p);
   if(!generic&&!(id&&kept.includes(id[1])))return;
   const twin=p.replace(/\.screen\.active\b/,'.screen.kept').replace(/(#screen-[a-z-]+)\.active\b/,'$1.kept');
   assert(parts.includes(twin),file+': "'+p+'" needs "'+twin+'" in the same rule');checked++;
  });
 }
});
assert(checked>=10,'active screen rules found: '+checked);
const ui=strip(fs.readFileSync(dir+'ui-2027.css','utf8'));
assert(ui.includes(kept.map(n=>'.ks-ui main>#screen-'+n).join(',')+'{position:absolute;top:16px;left:16px;right:16px}'),'kept screens sit where the in-flow screen sits');
assert(ui.includes('.ks-ui main>.screen.kept:not(.active){content-visibility:hidden;z-index:-1}'),'parked screens are locked and under the active one');
// The offset is the padding of main.
assert(/\.ks-ui main\{[^}]*padding:16px!important/.test(strip(fs.readFileSync(dir+'touch-shell.css','utf8'))),'main padding is 16 px');
const shell=fs.readFileSync(dir+'touch-shell.js','utf8');
assert(shell.includes("keptScreens=['"+kept.join("','")+"']"),'kept list in the shell');
assert(/s\.classList\.toggle\('active',on\);if\(on&&keptScreens\.indexOf\(name\)>=0/.test(shell),'kept only once activated');
// Nothing else reads the kept class: visibility checks stay on .active.
fs.readdirSync(dir).filter(f=>f.endsWith('.js')&&f!=='touch-shell.js').forEach(f=>assert(!/['".]kept\b(?!\s+for)/.test(fs.readFileSync(dir+f,'utf8').replace(/\/\/.*$/gm,'')),f+' must not depend on .kept'));
console.log('kept screens: '+checked+' active rules mirrored, parked rule present');
