#!/usr/bin/env node

/* eslint max-len: 0 */
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import findImports from 'find-imports';

// Copy necessary properties from 'package.json' to 'src/package.json'
import pkg from './package.json';
import pkgApp from './src/package.json';

const files = [
    'src/*.js',
    'src/app/**/*.{js,jsx}'
];
const deps = [
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

const target = path.resolve(__dirname, 'src/package.json');
const content = JSON.stringify(pkgApp, null, 2);
fs.writeFileSync(target, content + '\n', 'utf8');
