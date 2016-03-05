import gulp from 'gulp';
import runSequence from 'run-sequence';

export default (options) => {
    gulp.task('build-dev', (callback) => {
        runSequence(
            ['server', 'webpack:build-dev'],
            'dist'
        );
    });

    gulp.task('build', (callback) => {
        runSequence('clean',
            'bower',
            ['eslint', 'jscs', 'jshint'],
            ['server', 'webpack:build'],
            'i18next',
            'dist',
            callback
        );
    });
};
