'use strict';
// Plain-language help for Grbl alarms and errors: known codes, unknown codes,
// missing code, and every phrase present in the FR/EN/ES catalog.
const assert=require('assert').strict,fs=require('fs'),vm=require('vm');
const help=require('./touch/grbl-help');
const a9=help.alarm(9);assert.equal(a9.code,9);assert.match(a9.title,/^Alarme 9 : Prise d’origine/);assert.match(a9.action,/\$23/);
assert.match(help.alarm(1).action,/\$H/);assert.match(help.alarm(2).action,/\$130/);
const none=help.alarm(null);assert.equal(none.title,'Alarme');assert.match(none.action,/\$H/);
const other=help.alarm(42);assert.equal(other.title,'Alarme 42');assert.match(other.action,/documentation/);
assert.match(help.error(24).title,/^Erreur 24 : Deux commandes/);assert.match(help.error(22).action,/avance F/);
assert.equal(help.error(999).title,'Erreur 999');assert.equal(help.error(undefined).title,'Erreur ?');
assert.equal(help.text(help.error(20)),help.error(20).title+'. '+help.error(20).action);
for(const n of [1,2,3,4,5,6,7,8,9])assert(help.codes.alarms.includes(n),'alarm '+n);
// Every phrase is translated.
const context={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/touch/i18n-messages.js','utf8'),context);
const catalog=new Map(context.window.CNCTouchMessages.map(r=>[r[0].trim(),r]));
const phrases=help.rows().concat(['Alarme','Alarme','Erreur','Code non reçu. Si la carte demande la prise d’origine ou le déverrouillage, faites $H (ou $X) ; sinon consultez CNCjs.','Code propre à la carte : consultez sa documentation.']);
for(const p of phrases){const row=catalog.get(p.trim());assert(row,'missing translation: '+p);assert(row[1]&&row[2]&&row[1]!==p,'EN/ES for '+p);}
// The module translates at call time when the page has a catalog.
const page={window:{cncI18n:{t:s=>'['+s.trim()+']'}}};vm.runInNewContext(fs.readFileSync(__dirname+'/touch/grbl-help.js','utf8'),page);
assert.equal(page.window.CNCGrblHelp.error(22).title,'[Erreur]22 : [Avance non définie]');
console.log('PASS grbl help: alarms 1-9 and common errors explained, unknown and missing codes, every phrase translated.');
