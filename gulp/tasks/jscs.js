import gulp from 'gulp';
import jscs from 'gulp-jscs';

export default (options) => {
    gulp.task('jscs', () => {
        let jscsConfig = options.config.jscs;

        return gulp.src(jscsConfig.src)
            .pipe(jscs(jscsConfig.options)) // enforce style guide
            .pipe(jscs.reporter());
    });
};
