var gulp = require('gulp');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var csslint = require('gulp-csslint');

module.exports = function(options) {
    /**
     * Lint CSS files
     */
    gulp.task('csslint', ['stylus'], function() {
        var csslintConfig = options.config.csslint;

        return gulp.src(csslintConfig.src)
            .pipe(plumber({errorHandler: options.errorHandler.error}))
            .pipe(csslint(csslintConfig.options))
            .pipe(csslint.reporter())
            .pipe(csslint.failReporter());
    });
};
