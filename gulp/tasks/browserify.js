import _ from 'lodash';
import gulp from 'gulp';
import gutil from 'gulp-util';
import path from 'path';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import streamify from 'gulp-streamify';
import uglify from 'gulp-uglify';
import notify from 'gulp-notify';
import gulpif from 'gulp-if';
import rename from 'gulp-rename';
import exorcist from 'exorcist';
import watchify from 'watchify';
import livereload from 'gulp-livereload';

const createVendorBundle = (options) => {
    let browserifyConfig = _.get(options.config, 'browserify.vendor') || {};
    let uglifyConfig = _.get(options.config, 'uglify') || {};
    let bundleFile = 'vendor.js';
    let bundleMapFile = path.join(browserifyConfig.dest, 'vendor.js.map');
    let minifiedBundleFile = 'vendor.min.js';

    // Create a separate vendor bundler that will only run when starting gulp
    let bundler = browserify(browserifyConfig.options);
    _.each(browserifyConfig.require, (lib) => {
        bundler.require(lib);
    });

    let rebundle = () => {
        gutil.log('Rebundling "%s"...', gutil.colors.cyan(bundleFile));
        return bundler.bundle()
            .pipe(exorcist(bundleMapFile))
            .pipe(source(bundleFile))
            .pipe(gulpif(options.env !== 'development', streamify(uglify(uglifyConfig.options))))
            .pipe(gulp.dest(browserifyConfig.dest))
            .pipe(gulpif(options.watch, livereload()))
            .pipe(notify(() => {
                gutil.log('Finished "%s" bundle.', gutil.colors.cyan(bundleFile));
            }));
    };

    if (options.watch) { // Also see at gulp/tasks/watch.js
        bundler = watchify(bundler);
        bundler.on('time', (time) => {
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

const createAppBundle = (options) => {
    let browserifyConfig = _.get(options.config, 'browserify.app') || {};
    let uglifyConfig = _.get(options.config, 'uglify') || {};
    let browserifyTransform = browserifyConfig.transform;
    let bundleFile = 'app.js';
    let bundleMapFile = path.join(browserifyConfig.dest, 'app.js.map');
    let minifiedBundleFile = 'app.min.js';

    // Create the application bundler
    let bundler = browserify(browserifyConfig.options);
    bundler.add(browserifyConfig.src);
    bundler.transform('babelify', browserifyTransform['babelify']);
    bundler.transform('browserify-css', browserifyTransform['browserify-css']);
    bundler.transform('brfs');
    _.each(browserifyConfig.external, (lib) => {
        bundler.external(lib);
    });

    let rebundle = () => {
        gutil.log('Rebundling "%s"...', gutil.colors.cyan(bundleFile));
        return bundler.bundle()
            .pipe(exorcist(bundleMapFile))
            .pipe(source(bundleFile))
            .pipe(gulpif(options.env !== 'development', streamify(uglify(uglifyConfig.options))))
            .pipe(gulp.dest(browserifyConfig.dest))
            .pipe(gulpif(options.watch, livereload()))
            .pipe(notify(() => {
                gutil.log('Finished "%s" bundle.', gutil.colors.cyan(bundleFile));
            }));
    };

    if (options.watch) { // Also see at gulp/tasks/watch.js
        bundler = watchify(bundler);
        bundler.on('time', (time) => {
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

export default (options) => {
    gulp.task('browserify-watch', () => {
        options = _.extend(options, { watch: true });
        createVendorBundle(options);
        createAppBundle(options);
    });
    gulp.task('browserify', () => {
        createVendorBundle(options);
        createAppBundle(options);
    });
};
