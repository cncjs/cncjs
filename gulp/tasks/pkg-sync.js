/* eslint max-len: 0 */
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import gulp from 'gulp';
import pkg from '../../package.json';

const findDeps = (patterns) => {
    let filenames = [];

    patterns.forEach((pattern) => {
        filenames = filenames.concat(glob.sync(pattern));
    });

    let deps = [];
    _.each(filenames, (pathname) => {
        const content = fs.readFileSync(pathname, 'utf8');

        { // import
            let r = null;
            const patternImport = new RegExp(/[^0-9a-zA-Z_$\n]*import\s+("[^"]+"|'[^']+'|\{[^\}]+\}|[a-zA-Z_$][0-9a-zA-Z_$]*|(?:\*\s+as\s+[a-zA-Z_$][0-9a-zA-Z_$]*\s*,?\s*)*)\s*(?:from\s*((?:"[^"]+")|(?:'[^']+')))?/gm);
            while ((r = patternImport.exec(content))) {
                const dep = (r[2] || r[1] || '')
                    .replace(/^"(.+)"$/, '$1')
                    .replace(/^'(.+)'$/, '$1');

                if (dep.startsWith('.') || dep.startsWith('/')) {
                    continue;
                }

                deps = _.union(deps, [dep]);
            }
        }

        { // require
            let r = null;
            const patternRequire = new RegExp(/[^a-zA-Z0-9_\n]*require\(("[^"]+"|'[^']+'|[^"']+)\)/gm);
            while ((r = patternRequire.exec(content))) {
                const dep = (r[1] || '')
                    .replace(/^"(.+)"$/, '$1')
                    .replace(/^'(.+)'$/, '$1');

                if (dep.startsWith('.') || dep.startsWith('/')) {
                    continue;
                }

                deps = _.union(deps, [dep]);
            }
        }
    });

    deps = deps.sort();

    return deps;
};

export default (options) => {
    gulp.task('pkg-sync', (callback) => {
        // Copy necessary properties from 'package.json' to 'src/package.json'
        const _pkg = require('../../src/package.json');

        // Development:
        //   package.json
        //   - name: cncjs (https://www.npmjs.com/package/cncjs)
        //
        // Application:
        //   src/package.json
        //   - name: cnc
        _pkg.version = pkg.version;
        _pkg.homepage = pkg.homepage;
        _pkg.author = pkg.author;
        _pkg.license = pkg.license;
        _pkg.repository = pkg.repository;

        // Copy only Node.js dependencies to application package.json
        _pkg.dependencies = _.pick(pkg.dependencies, findDeps([
            'src/*.js',
            'src/app/**/*.{js,jsx}'
        ]));

        const target = path.resolve(__dirname, '../../src/package.json');
        const content = JSON.stringify(_pkg, null, 2);
        fs.writeFileSync(target, content + '\n', 'utf8');

        return gulp.src('src/package.json')
            .pipe(gulp.dest('dist/cnc'));
    });
};
