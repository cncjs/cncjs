var path = require('path');
var webpack = require('webpack');
var baseConfig = require('./webpack.config.base');

module.exports = Object.assign({}, baseConfig, {
    devtool: 'source-map',
    entry: {
        app: baseConfig.entry.app,
        vendor: baseConfig.entry.vendor
    },
    output: {
        path: path.join(__dirname, 'dist', 'web'),
        filename: '[name].js',
        publicPath: '/'
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                // This has effect on the react lib size
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js'),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            compressor: {
                warnings: false
            }
        })
    ]
});
