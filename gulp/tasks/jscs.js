import gulp from 'gulp';
import jscs from 'gulp-jscs';

const jscsConfig = {
    src: [
        'gulp/**/*.js',
        '*.js',
        '*.jsx',
        'src/{app,web}/**/*.js',
        'test/**/*.js',

        // exclusion
        '!src/web/vendor/**',
        '!test/**',
        '!**/node_modules/**'
    ]
};

export default (options) => {
    gulp.task('jscs', () => {
        return gulp.src(jscsConfig.src)
            .pipe(jscs()) // enforce style guide
            .pipe(jscs.reporter());
    });
};
