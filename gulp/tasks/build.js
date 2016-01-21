import gulp from 'gulp';
import runSequence from 'run-sequence';

export default (options) => {
    gulp.task('build-development', (callback) => {
        runSequence(
            ['stylus', 'csslint'],
            ['babel', 'browserify'],
            'dist'
        );
    });

    gulp.task('build-production', (callback) => {
        runSequence('clean',
            'bower',
            ['eslint', 'jscs', 'jshint'],
            ['stylus', 'csslint'],
            ['babel', 'browserify'],
            'i18next',
            'dist',
            callback
        );
    });
};
