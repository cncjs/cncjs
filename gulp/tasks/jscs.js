import gulp from 'gulp';
import jscs from 'gulp-jscs';

export default (options) => {
    gulp.task('jscs', () => {
        let jscsConfig = options.config.jscs;

        return gulp.src(jscsConfig.src)
            .pipe(jscs()) // enforce style guide
            .pipe(jscs.reporter());
    });
};
