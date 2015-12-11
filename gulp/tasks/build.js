import gulp from 'gulp';
import runSequence from 'run-sequence';

export default (options) => {
    gulp.task('b', ['browserify']);
    gulp.task('build', (callback) => {
        runSequence('clean',
            'bower',
            ['eslint', 'jscs', 'jshint'],
            ['styles'],
            'browserify',
            'i18next',
            callback
        );
    });
    gulp.task('styles', ['stylus', 'csslint']);
};
