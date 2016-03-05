import gulp from 'gulp';
import gutil from 'gulp-util';
import plumber from 'gulp-plumber';
import csslint from 'gulp-csslint';

const csslintConfig = {
    src: [
        'src/web/components/**/*.css',
        'src/web/styles/**/*.css'
        // exclusion
    ],
    options: require('../../config/csslint')
};

export default (options) => {
    gulp.task('csslint', ['stylus'], () => {
        return gulp.src(csslintConfig.src)
            .pipe(plumber({ errorHandler: options.errorHandler.error }))
            .pipe(csslint(csslintConfig.options))
            .pipe(csslint.reporter())
            .pipe(csslint.failReporter());
    });
};
