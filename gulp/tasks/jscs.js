import gulp from 'gulp';
import jscs from 'gulp-jscs';
import stylish from 'gulp-jscs-stylish';

export default (options) => {
    gulp.task('jscs', () => {
        let jscsConfig = options.config.jscs;

        return gulp.src(jscsConfig.src)
            .pipe(jscs(jscsConfig.options)) // enforce style guide
                .on('error', () => {}) // don't stop on error
            .pipe(stylish()); // log style errors
    });
};
