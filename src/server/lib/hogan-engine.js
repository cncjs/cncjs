import fs from 'fs';
import hogan from 'hogan.js';

// Compiled templates, keyed by absolute path. Only written when Express asks
// for caching, which it does by enabling 'view cache' in production.
const templateCache = {};

/**
 * An Express view engine for Hogan templates.
 *
 * This replaces `consolidate`, which exists to adapt thirty template engines
 * behind one interface. Every entry in `settings.view.engines` names 'hogan',
 * so twenty-nine of those adapters were dead weight that dragged in a bundled
 * `babel-core` — and with it `browserslist` and `json5`.
 *
 * Behaviour is kept as consolidate's hogan adapter had it: strip a UTF-8 BOM,
 * compile, then render with the options object as the context. Partials come
 * from `options.partials`; none of the three templates here uses any, but the
 * argument costs nothing and keeps the contract whole.
 */
const hoganEngine = (filePath, options, callback) => {
  const cached = options.cache ? templateCache[filePath] : null;

  if (cached) {
    try {
      callback(null, cached.render(options, options.partials));
    } catch (err) {
      callback(err);
    }
    return;
  }

  fs.readFile(filePath, 'utf8', (err, str) => {
    if (err) {
      callback(err);
      return;
    }

    try {
      const template = hogan.compile(str.replace(/^\uFEFF/, ''));

      if (options.cache) {
        templateCache[filePath] = template;
      }

      callback(null, template.render(options, options.partials));
    } catch (compileErr) {
      callback(compileErr);
    }
  });
};

export default hoganEngine;
