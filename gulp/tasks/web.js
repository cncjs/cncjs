import _ from 'lodash';
import gulp from 'gulp';
import gutil from 'gulp-util';
import webpack from 'webpack';
import webpackConfig from '../../webpack.config.babel';

const distConfig = {
    base: 'src/web',
    src: [
        'src/web/favicon.ico',
        'src/web/plugins.js',
        'src/web/{images,textures}/**/*',
        'src/web/vendor/**/*',
        'src/web/i18n/**/*'
    ],
    dest: 'dist/web'
};

export default (options) => {
    gulp.task('web:build-dev', (callback) => {
        const config = _.merge({}, webpackConfig, {
            debug: true,
            devtool: 'eval',
            output: {
                publicPath: '/dist/web/'
            }
        });

        Object.keys(config.entry).forEach((name) => {
            config.entry[name].unshift(
                // necessary for hot reloading with IE:
                'eventsource-polyfill',
                // listen to code updates emitted by hot middleware:
                'webpack-hot-middleware/client',
            );
        });
        config.plugins = config.plugins.concat(
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoErrorsPlugin()
        );
        webpack(config, (err, stats) => {
            if (err) {
                throw new gutil.PluginError('web:build-dev', err);
            }
            gutil.log('[web:build-dev]', stats.toString({ colors: true }));
            callback();
        });
    });

    gulp.task('web:build', (callback) => {
        const config = _.merge({}, webpackConfig, {
            devtool: 'source-map'
        });
        config.plugins = config.plugins.concat(
            new webpack.DefinePlugin({
                'process.env': {
                    // This has effect on the react lib size
                    'NODE_ENV': JSON.stringify('production')
                }
            }),
            new webpack.optimize.OccurrenceOrderPlugin(),
            new webpack.optimize.DedupePlugin(),
            new webpack.optimize.UglifyJsPlugin({
                compressor: {
                    warnings: false
                }
            })
        );

        webpack(config, (err, stats) => {
            if (err) {
                throw new gutil.PluginError('web:build', err);
            }
            gutil.log('[web:build]', stats.toString({ colors: true }));
            callback();
        });
    });

    gulp.task('web:i18n', ['i18next:web']);

    gulp.task('web:dist', () => {
        return gulp.src(distConfig.src, { base: distConfig.base })
            .pipe(gulp.dest(distConfig.dest));
    });
};
