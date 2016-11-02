/* eslint no-var: 0 */
var without = require('lodash/without');
var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var WebpackMd5HashPlugin = require('webpack-md5-hash');
var ManifestPlugin = require('webpack-manifest-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var InlineChunkWebpackPlugin = require('html-webpack-inline-chunk-plugin');
var baseConfig = require('./webpack.config.base');
var languages = require('./webpack.config.i18n').languages;
var pkg = require('./package.json');

var webpackConfig = Object.assign({}, baseConfig, {
    debug: true,
    devtool: 'eval',
    output: {
        path: path.join(__dirname, 'output/web'),
        chunkFilename: '[name].bundle.js?[hash]',
        filename: '[name].bundle.js?[hash]',
        pathinfo: true,
        publicPath: ''
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                // This has effect on the react lib size
                NODE_ENV: JSON.stringify('development')
            }
        }),
        new webpack.ContextReplacementPlugin(
            /moment[\/\\]locale$/,
            new RegExp('^\./(' + without(languages, 'en').join('|') + ')$')
        ),
        new webpack.optimize.CommonsChunkPlugin({
            // The order matters, the order should be reversed just like loader chain.
            // https://github.com/webpack/webpack/issues/1016
            names: ['vendor', 'polyfill', 'manifest'],
            filename: '[name].js?[hash]',
            minChunks: Infinity
        }),
        new WebpackMd5HashPlugin(),
        // Generates a manifest.json file in your root output directory with a mapping of all source file names to their corresponding output file.
        new ManifestPlugin({
            fileName: 'manifest.json'
        }),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new ExtractTextPlugin('[name].[contenthash].css?[hash]', { allChunks: true }),
        new webpack.HotModuleReplacementPlugin(),
        new HtmlWebpackPlugin({
            title: `cnc ${pkg.version}`,
            filename: 'index.hbs',
            template: path.resolve(__dirname, 'src/web/assets/index.hbs'),
            chunksSortMode: 'dependency' // Sort chunks by dependency
        }),
        new InlineChunkWebpackPlugin({
            inlineChunks: ['manifest']
        }),
        new webpack.NoErrorsPlugin()
    ]
});

Object.keys(webpackConfig.entry, (name) => {
    // necessary for hot reloading with IE:
    webpackConfig[name].push('eventsource-polyfill');
    // listen to code updates emitted by hot middleware:
    webpackConfig[name].push('webpack-hot-middleware/client');
});

module.exports = webpackConfig;
