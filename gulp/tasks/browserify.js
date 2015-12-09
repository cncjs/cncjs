var _ = require('lodash');
var gulp = require('gulp');
var gutil = require('gulp-util');
var path = require('path');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var gulpif = require('gulp-if');
var rename = require('gulp-rename');
var exorcist = require('exorcist');
var watchify = require('watchify');
var livereload = require('gulp-livereload');

var createVendorBundle = function(options) {
    var browserifyConfig = _.get(options.config, 'browserify.vendor') || {};
    var uglifyConfig = _.get(options.config, 'uglify') || {};
    var bundleFile = 'vendor.js';
    var bundleMapFile = path.join(browserifyConfig.dest, 'vendor.js.map');
    var minifiedBundleFile = 'vendor.min.js';

    // Create a separate vendor bundler that will only run when starting gulp
    var bundler = browserify(browserifyConfig.options);
    _.each(browserifyConfig.require, function(lib) {
        bundler.require(lib);
    });

    var rebundle = function() {
        gutil.log('Rebundling "%s"...', gutil.colors.cyan(bundleFile));
        return bundler.bundle()
            .pipe(exorcist(bundleMapFile))
            .pipe(source(bundleFile))
            .pipe(gulpif(options.env !== 'development', streamify(uglify(uglifyConfig.options))))
            .pipe(gulp.dest(browserifyConfig.dest))
            .pipe(gulpif(options.watch, livereload()))
            .pipe(notify(function() {
                gutil.log('Finished "%s" bundle.', gutil.colors.cyan(bundleFile));
            }));
    };

    if (options.watch) { // Also see at gulp/tasks/watch.js
        bundler = watchify(bundler);
        bundler.on('time', function(time) {
            gutil.log('Browserify "%s" in %s.', gutil.colors.cyan(bundleFile), gutil.colors.magenta(time + ' ms'));
        });
        bundler.on('update', rebundle);
        bundler.on('log', gutil.log);
        bundler.on('error', options.errorHandler.warning);
    } else {
        bundler.on('error', options.errorHandler.error);
    }

    // Trigger initial bundling
    return rebundle();
};

var createAppBundle = function(options) {
    var browserifyConfig = _.get(options.config, 'browserify.app') || {};
    var uglifyConfig = _.get(options.config, 'uglify') || {};
    var browserifyTransform = browserifyConfig.transform;
    var bundleFile = 'app.js';
    var bundleMapFile = path.join(browserifyConfig.dest, 'app.js.map');
    var minifiedBundleFile = 'app.min.js';

    // Create the application bundler
    var bundler = browserify(browserifyConfig.options);
    bundler.add(browserifyConfig.src);
    bundler.transform('babelify', browserifyTransform['babelify']);
    bundler.transform('browserify-css', browserifyTransform['browserify-css']);
    bundler.transform('brfs');
    _.each(browserifyConfig.external, function(lib) {
        bundler.external(lib);
    });

    var rebundle = function() {
        gutil.log('Rebundling "%s"...', gutil.colors.cyan(bundleFile));
        return bundler.bundle()
            .pipe(exorcist(bundleMapFile))
            .pipe(source(bundleFile))
            .pipe(gulpif(options.env !== 'development', streamify(uglify(uglifyConfig.options))))
            .pipe(gulp.dest(browserifyConfig.dest))
            .pipe(gulpif(options.watch, livereload()))
            .pipe(notify(function() {
                gutil.log('Finished "%s" bundle.', gutil.colors.cyan(bundleFile));
            }));
    };

    if (options.watch) { // Also see at gulp/tasks/watch.js
        bundler = watchify(bundler);
        bundler.on('time', function(time) {
            gutil.log('Browserify "%s" in %s.', gutil.colors.cyan(bundleFile), gutil.colors.magenta(time + ' ms'));
        });
        bundler.on('update', rebundle);
        bundler.on('log', gutil.log);
        bundler.on('error', options.errorHandler.warning);
    } else {
        bundler.on('error', options.errorHandler.error);
    }

    // Trigger initial bundling
    return rebundle();
};

module.exports = function(options) {
    gulp.task('browserify-watch', function() {
        options = _.extend(options, { watch: true });
        createVendorBundle(options);
        createAppBundle(options);
    });
    gulp.task('browserify', function() {
        createVendorBundle(options);
        createAppBundle(options);
    });
};
