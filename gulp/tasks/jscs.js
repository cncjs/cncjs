var gulp = require('gulp');
var jscs = require('gulp-jscs');
var stylish = require('gulp-jscs-stylish');

module.exports = function(options) {
    gulp.task('jscs', function() {
        var jscsConfig = options.config.jscs;
        var noop = function () {};
        return gulp.src(jscsConfig.src)
            .pipe(jscs(jscsConfig.options)) // enforce style guide
                .on('error', noop) // don't stop on error
            .pipe(stylish()); // log style errors
    });
};
