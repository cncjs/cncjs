import gulp from 'gulp';
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
            .pipe(csslint(csslintConfig.options))
            .pipe(csslint.reporter())
            .pipe(csslint.failReporter());
    });
};
