var path = require('path');
var webpack = require('webpack');
var baseConfig = require('./webpack.config.base');

module.exports = Object.assign({}, baseConfig, {
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
        path: path.join(__dirname, 'dist', 'web'),
        filename: '[name].js',
        publicPath: '/'
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js'),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin()
    ]
});
