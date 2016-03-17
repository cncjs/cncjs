import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import babel from 'gulp-babel';
import gutil from 'gulp-util';
import webpack from 'webpack';

// http://jlongster.com/Backend-Apps-with-Webpack--Part-I
let nodeModules = {};
fs.readdirSync('node_modules')
    .filter((x) => {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach((mod) => {
        nodeModules[mod] = 'commonjs ' + mod;
    });

const webpackProductionConfig = {
    target: 'node',
    context: path.resolve(__dirname, '../../src/app'),
    entry: {
        index: [
            './index.js'
        ]
    },
    output: {
        path: path.join(__dirname, 'dist', 'app'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    plugins: [
        /*
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            compressor: {
                warnings: false
            }
        })
        */
    ],
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                test: /\.jsx?$/,
                loader: 'babel',
                exclude: /node_modules/,
                query: {
                    presets: ['es2015', 'stage-0', 'react']
                }
            }
        ]
    },
    externals: nodeModules,
    resolveLoader: {
        modulesDirectories: [path.resolve(__dirname, 'node_modules')]
    },
    node: {
        console: true,
        global: true,
        process: true,
        Buffer: true,
        __filename: true, // Use relative path
        __dirname: true, // Use relative path
        setImmediate: true
    }
};

const distConfig = {
    base: 'src/app',
    src: [
        'src/app/{i18n,views}/**/*'
    ],
    dest: 'dist/app'
};

export default (options) => {
    gulp.task('app:build-dev', (callback) => {
        const src = [
            'src/app/**/*.js'
            // exclusion
        ];

        return gulp.src(src)
            .pipe(babel())
            .pipe(gulp.dest('dist/app'));
    });

    gulp.task('app:build-prod', (callback) => {
        webpack(webpackProductionConfig, (err, stats) => {
            if (err) {
                throw new gutil.PluginError('app:build', err);
            }
            gutil.log('[app:build]', stats.toString({ colors: true }));
            callback();
        });
    });

    gulp.task('app:i18n', ['i18next:app']);

    gulp.task('app:dist', () => {
        return gulp.src(distConfig.src, { base: distConfig.base })
            .pipe(gulp.dest(distConfig.dest));
    });
};
