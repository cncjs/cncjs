/* eslint no-var: 0 */
var _ = require('lodash');
var path = require('path');
var webpack = require('webpack');
var baseConfig = require('./webpack.config.base');

module.exports = _.assign({}, baseConfig, {
    debug: true,
    devtool: 'eval',
    entry: {
        app: [
            // necessary for hot reloading with IE:
            'eventsource-polyfill',
            // listen to code updates emitted by hot middleware:
            'webpack-hot-middleware/client'
        ].concat(baseConfig.entry.app),
        vendor: [
            // necessary for hot reloading with IE:
            'eventsource-polyfill',
            // listen to code updates emitted by hot middleware:
            'webpack-hot-middleware/client'
        ].concat(baseConfig.entry.vendor)
    },
    output: {
        path: path.join(__dirname, 'output/web'),
        filename: '[name].js',
        publicPath: '/'
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                // This has effect on the react lib size
                NODE_ENV: JSON.stringify('development')
            }
        }),
        new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js'),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin()
    ]
});
