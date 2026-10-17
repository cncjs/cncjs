'use strict';
// Offline checks only: explicit test list, no fixture server or machine connection.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {spawnSync} = require('child_process');
const root = __dirname;
const tests = [
 'arcs','dashboard','dry-motion','home-actions','job-dialog','job-display',
 'library-transitions','library-file-state','machine-limits',
 'preview-dimensions','preview-viewer','preview','probe-diagram',
 'probe-lock','probe-model','probe-preparation','probe-profiles','probe-transfer',
 'real-history','screen-saver','simulation-alarm','simulation-history',
 'simulation-motion','simulation-report','simulation-ui','simulation',
 'transition-performance','viewport-fit','startup','display-settings','download-file',
 'viewport-phases','hidden-views','preview-worker','library-payload',
 'library-lifecycle','library-upload-payload','library-regeneration-cancel','history-view',
 'job-stream-client','stream-protocol','controller-state','connection-status','operator-tools','i18n','journal-languages','profile-storage','perf-harness','viewport-recall','viewport-warmup','macros','system-monitor','tablet-actions','header-clock','backlight','viewport-scroll','commissioning','viewport-mutation','dom-fixture','interface-guide','grbl-help','travel-check'
].map(name=>'test-'+name+'.cjs');
// The backend (job service, event stream, motion preflight, probe input) lives in
// src/server/services/touch and is covered by the root Jest suite (`yarn test`).
const results = [];
const args = process.argv.slice(2);
if(args.length && (args.length!==2 || args[0]!=='--report')) {
 console.error('Usage : node verify-project.cjs [--report chemin.json]');
 process.exit(2);
}
if(Number(process.versions.node.split('.')[0])<18) {
 console.error('Vérifications sur PC : Node.js 18 ou ultérieur requis. Le serveur Pi est indépendant.');
 process.exit(2);
}
function check(name, action) {
 const start=Date.now();
 try { action(); results.push({name,ok:true,ms:Date.now()-start}); console.log('OK  '+name); }
 catch(error) { results.push({name,ok:false,ms:Date.now()-start,error:error.message}); console.error('ÉCHEC  '+name+'\n'+error.message); }
}
function run(file, syntax) {
 const child=spawnSync(process.execPath,syntax?['--check',path.join(root,file)]:[path.join(root,file)],
  {cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024,windowsHide:true});
 if(child.error || child.status!==0) throw Error(child.error?child.error.message:(child.stderr||child.stdout||'Processus interrompu'));
}
const manifestPath=path.join(root,'release-manifest.json');
if(fs.existsSync(manifestPath)) check('Intégrité de la sauvegarde',()=>{
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(manifest.version!==1 || !manifest.files || !Object.keys(manifest.files).length) throw Error('Manifeste invalide');
 Object.keys(manifest.files).forEach(file=>{
  const target=path.resolve(root,file);
  if(!target.startsWith(root+path.sep)) throw Error('Chemin hors archive');
  const actual=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  if(actual!==manifest.files[file]) throw Error('Fichier modifié : '+file);
 });
});
// On a damaged archive, do not execute tests from the altered package.
if(!results.some(result=>!result.ok)) {
 check('Syntaxe des scripts',()=>{
  const scripts=fs.readdirSync(path.join(root,'touch')).filter(name=>name.endsWith('.js')).map(name=>'touch/'+name);
  scripts.push('preview-server.cjs','dom-fixture.cjs','verify-project.cjs');
  scripts.concat(tests).forEach(file=>run(file,true));
 });
 check('Ressources locales des deux pages',()=>{
  ['index.html','simulation.html'].forEach(file=>{
   const html=fs.readFileSync(path.join(root,'touch',file),'utf8');
   const references=html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi);
   for(const match of references) {
    const reference=match[1].split(/[?#]/)[0];
    // CNCjs supplies absolute server resources, e.g. socket.io; these are not bundled.
    if(!reference || /^(?:\/|[a-z]+:)/i.test(reference)) continue;
    if(!fs.statSync(path.join(root,'touch',reference)).isFile()) throw Error('Ressource absente : '+reference);
   }
  });
 });
 tests.forEach(file=>check(file,()=>run(file,false)));
}
const report={version:1,date:new Date().toISOString(),node:process.version,scope:'offline-mocks-only',
 physicalMachineTested:false,ok:results.every(result=>result.ok),results};
if(args.length) fs.writeFileSync(path.resolve(args[1]),JSON.stringify(report,null,2)+'\n');
console.log(results.filter(result=>result.ok).length+'/'+results.length+' contrôles réussis. Aucun essai matériel.');
if(!report.ok) process.exitCode=1;
