import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import babel from 'gulp-babel';
import gutil from 'gulp-util';
import webpack from 'webpack';
import pkg from '../../package.json';

const NODE_MODULES = path.resolve(__dirname, '../../node_modules');

// http://jlongster.com/Backend-Apps-with-Webpack--Part-I
const externals = {};
fs.readdirSync(NODE_MODULES)
    .filter((x) => {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach((mod) => {
        externals[mod] = 'commonjs ' + mod;
    });

// Use publicPath for production
const payload = pkg.version;
const publicPath = (function(payload) {
    const algorithm = 'sha1';
    const buf = String(payload);
    const hash = crypto.createHash(algorithm).update(buf).digest('hex');
    return '/' + hash.substr(0, 8) + '/'; // 8 digits
}(payload));

const webpackProductionConfig = {
    target: 'node',
    context: path.resolve(__dirname, '../../src/app'),
    entry: {
        index: [
            './index.js'
        ]
    },
    output: {
        path: path.join(__dirname, '../../dist/cnc/app'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    plugins: [
        new webpack.DefinePlugin({
            'global.PUBLIC_PATH': JSON.stringify(publicPath)
        })
    ],
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                use: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    externals: externals,
    resolve: {
        extensions: ['.js', '.json', '.jsx']
    },
    resolveLoader: {
        modules: [NODE_MODULES]
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

export default (options) => {
    gulp.task('app:i18n', ['i18next:app']);

    //
    // Development Build
    //
    gulp.task('app:build-dev', (callback) => {
        if (process.env.NODE_ENV !== 'development') {
            const err = new Error('Set NODE_ENV to "development" for development build');
            throw new gutil.PluginError('app:build-dev', err);
        }

        const src = [
            'src/app/**/*.js'
            // exclusion
        ];
        return gulp.src(src)
            .pipe(babel())
            .pipe(gulp.dest('output/app'));
    });
    gulp.task('app:output', () => {
        const files = [
            'src/app/{i18n,views}/**/*'
        ];

        return gulp.src(files, { base: 'src/app' })
            .pipe(gulp.dest('output/app'));
    });

    //
    // Production Build
    //
    gulp.task('app:build-prod', (callback) => {
        if (process.env.NODE_ENV !== 'production') {
            const err = new Error('Set NODE_ENV to "production" for production build');
            throw new gutil.PluginError('app:build', err);
        }

        webpack(webpackProductionConfig, (err, stats) => {
            if (err) {
                throw new gutil.PluginError('app:build', err);
            }
            gutil.log('[app:build]', stats.toString({ colors: true }));
            callback();
        });
    });
    gulp.task('app:dist', () => {
        const files = [
            'src/app/{i18n,views}/**/*'
        ];

        return gulp.src(files, { base: 'src/app' })
            .pipe(gulp.dest('dist/cnc/app'));
    });
};
