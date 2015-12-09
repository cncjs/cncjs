import gulp from 'gulp';
import jshint from 'gulp-jshint';

export default (options) => {
    // Check JSON with JSHint
    gulp.task('jshint', () => {
        let jshintConfig = options.config.jshint;

        return gulp.src(jshintConfig.src)
            .pipe(jshint(jshintConfig.options))
            // You can choose any JSHint reporter when you call
            // https://github.com/jshint/jshint/tree/master/src/reporters
            .pipe(jshint.reporter('default', { verbose: true }))
            .pipe(jshint.reporter('fail'))
                .on('error', options.errorHandler.error);
    });
};
