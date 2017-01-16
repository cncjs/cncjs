/* eslint no-var: 0 */
/* eslint prefer-arrow-callback: 0 */
var without = require('lodash/without');
var crypto = require('crypto');
var path = require('path');
var findImports = require('find-imports');
var webpack = require('webpack');
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

// Use publicPath for production
var payload = pkg.version;
var publicPath = (function(payload) {
    var algorithm = 'sha1';
    var buf = String(payload);
    var hash = crypto.createHash(algorithm).update(buf).digest('hex');
    return '/' + hash.substr(0, 8) + '/'; // 8 digits
}(payload));

var webpackConfig = Object.assign({}, baseConfig, {
    devtool: 'source-map',
    entry: {
        polyfill: [
            path.resolve(__dirname, 'src/web/polyfill/index.js')
        ],
        vendor: findImports([
            'src/web/**/*.{js,jsx}',
            '!src/web/polyfill/**/*.js',
            '!src/web/containers/DevTools.js', // redux-devtools
            '!src/web/**/*.development.js'
        ], { flatten: true }),
        app: [
            path.resolve(__dirname, 'src/web/index.jsx')
        ]
    },
    output: {
        path: path.join(__dirname, 'dist/cnc/web'),
        chunkFilename: '[name].[chunkhash].bundle.js',
        filename: '[name].[chunkhash].bundle.js',
        publicPath: publicPath
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                // This has effect on the react lib size
                NODE_ENV: JSON.stringify('production')
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
            filename: '[name].[chunkhash].js',
            minChunks: Infinity
        }),
        new WebpackMd5HashPlugin(),
        // Generates a manifest.json file in your root output directory with a mapping of all source file names to their corresponding output file.
        new ManifestPlugin({
            fileName: 'manifest.json'
        }),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new ExtractTextPlugin('[name].css', { allChunks: false }),
        new CSSSplitWebpackPlugin({
            size: 4000,
            imports: '[name].[ext]?[hash]',
            filename: '[name]-[part].[ext]?[hash]',
            preserve: false
        }),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                screw_ie8: true, // React doesn't support IE8
                warnings: false
            },
            mangle: {
                screw_ie8: true
            },
            output: {
                comments: false,
                screw_ie8: true
            }
        }),
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

module.exports = webpackConfig;
