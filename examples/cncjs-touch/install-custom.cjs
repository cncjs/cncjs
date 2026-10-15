'use strict';
// Offline patcher only. Never connects to CNCjs, installs packages, or restarts a service.
const fs = require('fs');
const path = require('path');
const BEGIN = '    // BEGIN CNC TOUCH CUSTOM V3';
const END = '    // END CNC TOUCH CUSTOM V3';
const marker = '    app.get((0, _urljoin["default"])(_settings["default"].route, \'api/gcode\'), api.gcode.fetch);';
const block = [BEGIN,
  '    (function installTouchBootstrap() {',
  '      var touchBase = (_settings["default"].route || "").replace(/\\/$/, "") + "/api";',
  '      var touchHealth = { loaded: false, version: null, protocol: null, reason: "module_not_configured" };',
  '      app.get(touchBase + "/custom/health", function (req, res) {',
  '        if (!req.user || typeof req.user !== "object") return res.status(401).send({ message: "Session CNCjs requise." });',
  '        res.send(touchHealth);',
  '      });',
  '      try {',
  '        var touchModule = process.env.CNC_TOUCH_MODULE;',
  '        if (touchModule) {',
  '          if (!require("path").isAbsolute(touchModule)) throw new Error("absolute_module_path_required");',
  '          var touchService = require(touchModule).install(app, __dirname, { health: false, settings: _settings["default"] });',
  '          touchHealth = { loaded: true, version: touchService.version, protocol: 1, transport: "ndjson" };',
  '        }',
  '      } catch (_) { touchHealth.reason = "module_load_failed"; }',
  '      console.info("CNC Touch custom: loaded=" + touchHealth.loaded + "; version=" + (touchHealth.version || "none"));',
  '    }());', END].join('\n');

function patch(source) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const text = source.replace(/\r\n/g, '\n');
  if (text.indexOf('credentialsRequired: true') < 0 || text.indexOf('Register API routes with authorized access') < 0) throw Error('Unsupported CNCjs authentication layout.');
  if (text.split(marker).length !== 2 || text.indexOf(marker) < text.indexOf('credentialsRequired: true')) throw Error('Unsupported CNCjs route layout.');
  let clean = text;
  if (clean.includes(BEGIN) || clean.includes(END)) {
    if (clean.split(BEGIN).length !== 2 || clean.split(END).length !== 2 || clean.indexOf(END) < clean.indexOf(BEGIN)) throw Error('Ambiguous custom bootstrap.');
    clean = clean.slice(0, clean.indexOf(BEGIN)) + clean.slice(clean.indexOf(END) + END.length).replace(/^\n/, '');
  }
  const legacy = /^    require\(['"][^'"\r\n]*\/job-service\.js['"]\)\.install\(app, __dirname\);\n/gm;
  if ((clean.match(legacy) || []).length > 1) throw Error('Multiple legacy installations.');
  clean = clean.replace(legacy, '');
  return clean.replace(marker, block+'\n'+marker).replace(/\n/g, newline);
}
if (require.main === module) {
  const target = process.argv[2];
  if (!target || !path.isAbsolute(target)) throw Error('Usage: node install-custom.cjs <absolute CNCjs server/app.js path>. Configure CNC_TOUCH_MODULE separately.');
  const source = fs.readFileSync(target,'utf8'), result = patch(source);
  if (source === result) console.log('CNC Touch bootstrap already current. No change.');
  else {
    const backup=target+'.touch-'+Date.now()+'.bak', staged=target+'.touch-new';
    fs.copyFileSync(target,backup,fs.constants.COPYFILE_EXCL);
    fs.writeFileSync(staged,result,{mode:fs.statSync(target).mode,flag:'wx'});
    try { new (require('vm').Script)(result,{filename:target}); fs.renameSync(staged,target); }
    catch(error) { fs.unlinkSync(staged); throw error; }
    console.log('Bootstrap patched. Backup: '+backup+'. Service restart is a separate, controlled operation.');
  }
}
module.exports={patch};
