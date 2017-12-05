process.env.NODE_ENV = 'production';

/* eslint prefer-arrow-callback: 0 */
const without = require('lodash/without');
const crypto = require('crypto');
const path = require('path');
const findImports = require('find-imports');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CSSSplitWebpackPlugin = require('css-split-webpack-plugin').default;
const ManifestPlugin = require('webpack-manifest-plugin');
const InlineChunkWebpackPlugin = require('html-webpack-inline-chunk-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginAddons = require('html-webpack-plugin-addons');
const nib = require('nib');
const stylusLoader = require('stylus-loader');
const baseConfig = require('./webpack.webconfig.base');
const buildConfig = require('./build.config');
const pkg = require('./package.json');

// Use publicPath for production
const payload = pkg.version;
const publicPath = (function(payload) {
    const algorithm = 'sha1';
    const buf = String(payload);
    const hash = crypto.createHash(algorithm).update(buf).digest('hex');
    return '/' + hash.substr(0, 8) + '/'; // 8 digits
}(payload));

const timestamp = new Date().getTime();

const webpackConfig = Object.assign({}, baseConfig, {
    devtool: 'cheap-module-source-map',
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
        path: path.resolve(__dirname, 'dist/cnc/web'),
        chunkFilename: `[name].[chunkhash].bundle.js?_=${timestamp}`,
        filename: `[name].[chunkhash].bundle.js?_=${timestamp}`,
        publicPath: publicPath
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                // This has effect on the react lib size
                NODE_ENV: JSON.stringify('production'),
                LANGUAGES: JSON.stringify(buildConfig.languages),
                TRACKING_ID: JSON.stringify(buildConfig.analytics.trackingId)
            }
        }),
        new webpack.NoEmitOnErrorsPlugin(),
        new stylusLoader.OptionsPlugin({
            default: {
                // nib - CSS3 extensions for Stylus
                use: [nib()],
                // no need to have a '@import "nib"' in the stylesheet
                import: ['~nib/lib/nib/index.styl']
            }
        }),
        new webpack.ContextReplacementPlugin(
            /moment[\/\\]locale$/,
            new RegExp('^\./(' + without(buildConfig.languages, 'en').join('|') + ')$')
        ),
        new webpack.optimize.CommonsChunkPlugin({
            // The order matters, the order should be reversed just like loader chain.
            // https://github.com/webpack/webpack/issues/1016
            names: ['vendor', 'polyfill', 'manifest'],
            filename: `[name].[chunkhash].js?_=${timestamp}`,
            minChunks: Infinity
        }),
        // Generates a manifest.json file in your root output directory with a mapping of all source file names to their corresponding output file.
        new ManifestPlugin({
            fileName: 'manifest.json'
        }),
        new ExtractTextPlugin({
            filename: '[name].css',
            allChunks: false
        }),
        new CSSSplitWebpackPlugin({
            size: 4000,
            imports: '[name].[ext]?[hash]',
            filename: '[name]-[part].[ext]?[hash]',
            preserve: false
        }),
        new webpack.optimize.UglifyJsPlugin({
            sourceMap: true,
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
            afterHTMLProcessing: function(htmlPluginData, next) {
                const re = new RegExp(/<link.* href="[^"]+\w+\-\d+\.css[^>]+>/);
                htmlPluginData.html = htmlPluginData.html.replace(re, '');
                next(null, htmlPluginData);
            }
        }),
        new InlineChunkWebpackPlugin({
            inlineChunks: ['manifest']
        })
    ]
});

module.exports = webpackConfig;
