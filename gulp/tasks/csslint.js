import gulp from 'gulp';
import gutil from 'gulp-util';
import plumber from 'gulp-plumber';
import csslint from 'gulp-csslint';

export default (options) => {
    gulp.task('csslint', ['stylus'], () => {
        let csslintConfig = options.config.csslint;

        return gulp.src(csslintConfig.src)
            .pipe(plumber({ errorHandler: options.errorHandler.error }))
            .pipe(csslint(csslintConfig.options))
            .pipe(csslint.reporter())
            .pipe(csslint.failReporter());
    });
};
