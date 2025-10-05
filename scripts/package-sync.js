#!/usr/bin/env node

/* eslint max-len: 0 */
const fs = require('fs');
const path = require('path');
const _pick = require('lodash/pick');
const _uniq = require('lodash/uniq');
const findImports = require('find-imports');

// Copy necessary properties from 'package.json' to 'src/package.json'
const pkg = require('../package.json');
const pkgApp = require('../src/package.json');

const files = [
  'src/*.js',
  'src/server/**/*.{js,jsx}'
];

const resolvedImports = findImports(files, {
  flatten: true,
});

const deps = _uniq([
  '@serialport/parser-readline',
  'core-js', // to polyfill ECMAScript features
  'regenerator-runtime', // needed to use transpiled generator functions
  'debug', // 'debug' is required for electron app

  // e.g. 'lodash/get' → 'lodash'
  ...resolvedImports.map(x => x.split('/')[0]),
]).sort();

//pkgApp.name = pkg.name; // Exclude the name field
pkgApp.version = pkg.version;
pkgApp.homepage = pkg.homepage;
pkgApp.author = pkg.author;
pkgApp.license = pkg.license;
pkgApp.repository = pkg.repository;

// Copy only Node.js dependencies to application package.json
pkgApp.dependencies = _pick(pkg.dependencies, deps);

const target = path.resolve(__dirname, '../src/package.json');
const content = JSON.stringify(pkgApp, null, 2);
fs.writeFileSync(target, content + '\n', 'utf8');
