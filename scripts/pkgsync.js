#!/usr/bin/env node

/* eslint max-len: 0 */
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var findImports = require('find-imports');

// Copy necessary properties from 'package.json' to 'src/package.json'
var pkg = require('../package.json');
var pkgApp = require('../src/package.json');

var files = [
    'src/*.js',
    'src/app/**/*.{js,jsx}'
];
var deps = [
    'babel-runtime', // 'babel-runtime' is required for desktop app
    'debug' // 'debug' is required for desktop app
].concat(findImports(files, { flatten: true })).sort();

pkgApp.name = pkg.name;
pkgApp.version = pkg.version;
pkgApp.homepage = pkg.homepage;
pkgApp.author = pkg.author;
pkgApp.license = pkg.license;
pkgApp.repository = pkg.repository;

// Copy only Node.js dependencies to application package.json
pkgApp.dependencies = _.pick(pkg.dependencies, deps);

var target = path.resolve(__dirname, '../src/package.json');
var content = JSON.stringify(pkgApp, null, 2);
fs.writeFileSync(target, content + '\n', 'utf8');
