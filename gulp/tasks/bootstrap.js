import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import babel from 'gulp-babel';
import pkg from '../../package.json';

export default (options) => {
    gulp.task('bootstrap:babel', (callback) => {
        const src = [
            'src/*.js'
        ];
        return gulp.src(src)
            .pipe(babel())
            .pipe(gulp.dest('dist/cnc'));
    });
    gulp.task('bootstrap:pkg', (callback) => {
        // Copy necessary properties from 'package.json' to 'src/package.json'
        const _pkg = require('../../src/package.json');

        // Development package.json: name=cncjs (https://www.npmjs.com/package/cncjs)
        // Application package.json: name=cnc
        _pkg.version = pkg.version;
        _pkg.description = pkg.description;
        _pkg.homepage = pkg.homepage;
        _pkg.author = pkg.author;
        _pkg.license = pkg.license;
        _pkg.dependencies = pkg.dependencies;

        fs.writeFileSync(path.resolve(__dirname, '../../src/package.json'), JSON.stringify(_pkg, null, 2), 'utf8');

        return gulp.src('src/package.json')
            .pipe(gulp.dest('dist/cnc'));
    });
    gulp.task('bootstrap', ['bootstrap:babel', 'bootstrap:pkg']);
};
