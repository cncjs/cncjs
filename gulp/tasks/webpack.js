import _ from 'lodash';
import gulp from 'gulp';
import gutil from 'gulp-util';
import webpack from 'webpack';
import webpackConfig from '../../webpack.config.babel';

// https://github.com/webpack/webpack-with-common-libs/blob/master/gulpfile.js

export default (options) => {
    gulp.task('webpack:build', (callback) => {
        let config = Object.create(webpackConfig);
        config.plugins = config.plugins.concat(
            new webpack.DefinePlugin({
                'process.env': {
                    // This has effect on the react lib size
                    'NODE_ENV': JSON.stringify('production')
                }
            }),
            new webpack.optimize.DedupePlugin(),
            new webpack.optimize.UglifyJsPlugin()
        );

        // run webpack
        webpack(config, (err, stats) => {
            if (err) {
                throw new gutil.PluginError('webpack:build', err);
            }
            gutil.log('[webpack:build]', stats.toString({ colors: true }));
            callback();
        });
    });

    const devConfig = _.merge({}, webpackConfig, {
        debug: true,
        devtool: 'sourcemap'
    });
    const devCompiler = webpack(devConfig);

    gulp.task('webpack:build-dev', (callback) => {
        // run webpack
        devCompiler.run((err, stats) => {
            if (err) {
                throw new gutil.PluginError('webpack:build-dev', err);
            }
            gutil.log('[webpack:build-dev]', stats.toString({ colors: true }));
            callback();
        });
    });
};
