import _ from 'lodash';
import gulp from 'gulp';
import gutil from 'gulp-util';
import path from 'path';
import fse from 'fs-extra';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import uglify from 'gulp-uglify';
import notify from 'gulp-notify';
import gulpif from 'gulp-if';
import exorcist from 'exorcist';
import watchify from 'watchify';
import livereload from 'gulp-livereload';

const bundleDependencies = {
    'vendor': [
        'async',
        'classnames',
        'gcode-interpreter',
        'gcode-parser',
        'history',
        'i18next',
        'jsuri',
        'lodash',
        'moment',
        'pubsub-js',
        'rc-slider',
        'rc-switch',
        'react',
        'react-dom',
        'react-addons-update',
        'react-bootstrap',
        'react-datagrid',
        'react-dom',
        'react-datagrid',
        'react-dropzone',
        'react-infinite',
        'react-router',
        'react-select',
        'request',
        'sha1',
        'sortablejs',
        'three',

        // Bower Components
        'stacktrace'
    ]
};

const uglifyConfig = {
    options: {
        compress: true,
        mangle: false
    }
};

const vendorConfig = {
    dest: 'dist/web/',
    options: {
        debug: true // Sourcemapping
    },
    require: bundleDependencies.vendor
};

const appConfig = {
    src: [
        './src/web/index.jsx'
    ],
    dest: 'dist/web/',
    options: {
        paths: [],
        extensions: ['.jsx'], // default: .js and .json
        debug: true, // Sourcemapping

        // watchify requires these options
        cache: {},
        packageCache: {},
        fullPaths: true
    },
    external: _.union(
        bundleDependencies.vendor
    ),
    transform: {
        'babelify': {
            presets: ['es2015', 'stage-0', 'react']
        },
        'browserify-css': {
            autoInject: true,
            autoInjectOptions: {
                'verbose': true
            },
            rootDir: 'src/web/',
            minify: true,
            // Example:
            //   source={webroot}/../node_modules/bootstrap/**/*
            //   target={webroot}/vendor/bootstrap/**/*
            processRelativeUrl: (relativeUrl) => {
                const stripQueryStringAndHashFromPath = (url) => {
                    return url.split('?')[0].split('#')[0];
                };
                let sourceDir = path.resolve(process.cwd(), 'src', 'web');
                let targetDir = path.resolve(process.cwd(), 'dist', 'web');
                let relativePath = stripQueryStringAndHashFromPath(relativeUrl);
                let queryStringAndHash = relativeUrl.substring(relativePath.length);
                let prefix = '../../node_modules/';

                if (_.startsWith(relativePath, prefix)) {
                    let vendorPath = 'vendor/' + relativePath.substring(prefix.length);
                    let source = path.join(sourceDir, relativePath);
                    let target = path.join(targetDir, vendorPath);

                    gutil.log('Copying file from ' + JSON.stringify(source) + ' to ' + JSON.stringify(target));
                    fse.copySync(source, target);

                    // Returns a new path string with original query string and hash fragments
                    return vendorPath + queryStringAndHash;
                }

                if (_.startsWith(relativeUrl, 'components')) {
                    let source = path.join(sourceDir, relativeUrl);
                    let target = path.join(targetDir, relativeUrl);
                    fse.copySync(source, target);
                }

                return relativeUrl;
            }
        }
    }
};

const createVendorBundle = (options) => {
    let bundleFile = 'vendor.js';
    let bundleMapFile = path.join(vendorConfig.dest, 'vendor.js.map');

    // Create a separate vendor bundler that will only run when starting gulp
    let bundler = browserify(vendorConfig.options);
    _.each(vendorConfig.require, (lib) => {
        bundler.require(lib);
    });

    let rebundle = () => {
        gutil.log('Rebundling "%s"...', gutil.colors.cyan(bundleFile));
        return bundler.bundle()
            .pipe(exorcist(bundleMapFile))
            .pipe(source(bundleFile)) // streaming vinyl file object
            .pipe(buffer()) // convert from streaming to buffered vinyl file object
            .pipe(uglify(uglifyConfig.options))
            .pipe(gulp.dest(vendorConfig.dest))
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
    }

    // Trigger initial bundling
    return rebundle();
};

const createAppBundle = (options) => {
    let browserifyTransform = appConfig.transform;
    let bundleFile = 'app.js';
    let bundleMapFile = path.join(appConfig.dest, 'app.js.map');

    // Create the application bundler
    let bundler = browserify(appConfig.options);
    bundler.add(appConfig.src);
    bundler.transform('babelify', browserifyTransform.babelify);
    bundler.transform('browserify-css', browserifyTransform['browserify-css']);
    bundler.transform('brfs');
    _.each(appConfig.external, (lib) => {
        bundler.external(lib);
    });

    let rebundle = () => {
        gutil.log('Rebundling "%s"...', gutil.colors.cyan(bundleFile));
        return bundler.bundle()
            .pipe(exorcist(bundleMapFile))
            .pipe(source(bundleFile)) // streaming vinyl file object
            .pipe(buffer()) // convert from streaming to buffered vinyl file object
            .pipe(uglify(uglifyConfig.options))
            .pipe(gulp.dest(appConfig.dest))
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
