import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import pkg from '../../package.json';

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
        _pkg.dependencies = pkg.dependencies;

        const target = path.resolve(__dirname, '../../src/package.json');
        const content = JSON.stringify(_pkg, null, 2);
        fs.writeFileSync(target, content + '\n', 'utf8');

        return gulp.src('src/package.json')
            .pipe(gulp.dest('dist/cnc'));
    });
};
