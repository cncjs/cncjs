var gulp = require('gulp');
var plumber = require('gulp-plumber');
var stylus = require('gulp-stylus');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var nib = require('nib');

module.exports = function(options) {
    gulp.task('stylus', function() {
        var stylusConfig = options.config.stylus;
        var autoprefixerConfig = options.config.autoprefixer;

        // nib - CSS3 extensions for Stylus
        stylusConfig.options.use = nib();
        stylusConfig.options.import = ['nib']; // no need to have a '@import "nib"' in the stylesheet

        return gulp.src(stylusConfig.src)
            .pipe(plumber({errorHandler: options.errorHandler.error}))
            .pipe(sourcemaps.init())
                .pipe(stylus(stylusConfig.options))
                .pipe(autoprefixer(autoprefixerConfig.options))
            .pipe(sourcemaps.write('/', {includeContent: false}))
            .pipe(gulp.dest(stylusConfig.dest));
    });
};
