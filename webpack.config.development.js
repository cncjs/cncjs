/* eslint no-var: 0 */
/* eslint prefer-arrow-callback: 0 */
var without = require('lodash/without');
var path = require('path');
var webpack = require('webpack');
var WriteFileWebpackPlugin = require('write-file-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var CSSSplitWebpackPlugin = require('css-split-webpack-plugin').default;
var WebpackMd5HashPlugin = require('webpack-md5-hash');
var ManifestPlugin = require('webpack-manifest-plugin');
var InlineChunkWebpackPlugin = require('html-webpack-inline-chunk-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackPluginAddons = require('html-webpack-plugin-addons');
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
        // https://github.com/gajus/write-file-webpack-plugin
        // Forces webpack-dev-server to write bundle files to the file system.
        new WriteFileWebpackPlugin(),
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
        new ExtractTextPlugin('[name].css', { allChunks: true }),
        new CSSSplitWebpackPlugin({
            size: 4000,
            imports: '[name].[ext]?[hash]',
            filename: '[name]-[part].[ext]?[hash]',
            preserve: false
        }),
        new webpack.HotModuleReplacementPlugin(),
        new HtmlWebpackPlugin({
            title: `cnc ${pkg.version}`,
            filename: 'index.hbs',
            template: path.resolve(__dirname, 'src/web/assets/index.hbs'),
            chunksSortMode: 'dependency' // Sort chunks by dependency
        }),
        new HtmlWebpackPluginAddons({
            /**
             * Do not insert "[name]-[part].css" to the html. For example:
             * <link href="/9b80ca13/[name]-1.css?0584938f631ef1dd3e93d8d8169648a0" rel="stylesheet">
             * <link href="/9b80ca13/[name]-2.css?0584938f631ef1dd3e93d8d8169648a0" rel="stylesheet">
             * <link href="/9b80ca13/[name].css?ff4bb41b7b5e61a63da54dff2e59581d" rel="stylesheet">
             */
            afterHTMLProcessing: function(pluginData, next) {
                const re = new RegExp(/<link.* href="[^"]+\w+\-\d+\.css[^>]+>/);
                pluginData.html = pluginData.html.replace(re, '');
                next(null);
            }
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
