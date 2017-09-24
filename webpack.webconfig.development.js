/* eslint no-var: 0 */
/* eslint prefer-arrow-callback: 0 */
const without = require('lodash/without');
const path = require('path');
const webpack = require('webpack');
const WriteFileWebpackPlugin = require('write-file-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CSSSplitWebpackPlugin = require('css-split-webpack-plugin').default;
//const WebpackMd5HashPlugin = require('webpack-md5-hash');
const ManifestPlugin = require('webpack-manifest-plugin');
const InlineChunkWebpackPlugin = require('html-webpack-inline-chunk-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginAddons = require('html-webpack-plugin-addons');
const nib = require('nib');
const stylusLoader = require('stylus-loader');
const baseConfig = require('./webpack.webconfig.base');
const languages = require('./i18n.config').languages;
const pkg = require('./package.json');

const timestamp = new Date().getTime();

const webpackConfig = Object.assign({}, baseConfig, {
    devtool: 'eval',
    entry: {
        polyfill: [
            // https://github.com/Yaffle/EventSource
            'eventsource-polyfill',
            // https://github.com/glenjamin/webpack-hot-middleware
            'webpack-hot-middleware/client?reload=true',
            path.resolve(__dirname, 'src/web/polyfill/index.js')
        ],
        app: [
            // https://github.com/Yaffle/EventSource
            'eventsource-polyfill',
            // https://github.com/glenjamin/webpack-hot-middleware
            'webpack-hot-middleware/client?reload=true',
            path.resolve(__dirname, 'src/web/index.jsx')
        ]
    },
    output: {
        path: path.resolve(__dirname, 'output/web'),
        chunkFilename: `[name].[hash].bundle.js?_=${timestamp}`,
        filename: `[name].[hash].bundle.js?_=${timestamp}`,
        pathinfo: true,
        publicPath: ''
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                // This has effect on the react lib size
                NODE_ENV: JSON.stringify('development'),
                I18N: JSON.stringify({
                    languages: languages
                })
            }
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
        new webpack.LoaderOptionsPlugin({
            debug: true
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
        // https://github.com/gajus/write-file-webpack-plugin
        // Forces webpack-dev-server to write bundle files to the file system.
        new WriteFileWebpackPlugin(),
        new webpack.ContextReplacementPlugin(
            /moment[\/\\]locale$/,
            new RegExp('^\./(' + without(languages, 'en').join('|') + ')$')
        ),
        new webpack.optimize.CommonsChunkPlugin({
            // The order matters, the order should be reversed just like loader chain.
            // https://github.com/webpack/webpack/issues/1016
            names: ['vendor', 'polyfill', 'manifest'],
            filename: `[name].[hash].js?_=${timestamp}`,
            minChunks: Infinity
        }),
        //new WebpackMd5HashPlugin(),
        // Generates a manifest.json file in your root output directory with a mapping of all source file names to their corresponding output file.
        new ManifestPlugin({
            fileName: 'manifest.json'
        }),
        new ExtractTextPlugin({
            filename: '[name].css',
            allChunks: true
        }),
        new CSSSplitWebpackPlugin({
            size: 4000,
            imports: '[name].[ext]?[hash]',
            filename: '[name]-[part].[ext]?[hash]',
            preserve: false
        }),
        new HtmlWebpackPlugin({
            title: `cnc ${pkg.version}`,
            filename: 'index.hbs',
            template: path.resolve(__dirname, 'src/web/assets/index.hbs'),
            chunksSortMode: 'dependency' // Sort chunks by dependency
        }),
        new HtmlWebpackPluginAddons({
            // Do not insert "[name]-[part].css" to the html. For example:
            // <link href="/9b80ca13/[name]-1.css?0584938f631ef1dd3e93d8d8169648a0" rel="stylesheet">
            // <link href="/9b80ca13/[name]-2.css?0584938f631ef1dd3e93d8d8169648a0" rel="stylesheet">
            // <link href="/9b80ca13/[name].css?ff4bb41b7b5e61a63da54dff2e59581d" rel="stylesheet">
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
