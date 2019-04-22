#!/usr/bin/env node

/* eslint max-len: 0 */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const findImports = require('find-imports');

// Copy necessary properties from 'package.json' to 'src/package.json'
const pkg = require('../package.json');
const pkgApp = require('../src/package.json');

const files = [
    'src/*.js',
    'src/server/**/*.{js,jsx}'
];
const deps = [
    '@babel/runtime', // 'babel-runtime' is required for electron app
    'debug' // 'debug' is required for electron app
].concat(findImports(files, { flatten: true })).sort();

//pkgApp.name = pkg.name; // Exclude the name field
pkgApp.version = pkg.version;
pkgApp.homepage = pkg.homepage;
pkgApp.author = pkg.author;
pkgApp.license = pkg.license;
pkgApp.repository = pkg.repository;

// Copy only Node.js dependencies to application package.json
pkgApp.dependencies = _.pick(pkg.dependencies, deps);

const target = path.resolve(__dirname, '../src/package.json');
const content = JSON.stringify(pkgApp, null, 2);
fs.writeFileSync(target, content + '\n', 'utf8');
