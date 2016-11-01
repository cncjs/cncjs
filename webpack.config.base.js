/* eslint no-var: 0 */
var nib = require('nib');
var path = require('path');
var findImports = require('find-imports');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    cache: true,
    target: 'web',
    context: path.resolve(__dirname, 'src/web'),
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
    module: {
        preLoaders: [
            // http://survivejs.com/webpack_react/linting_in_webpack/
            {
                test: /\.jsx?$/,
                loaders: ['eslint'],
                exclude: /node_modules/
            },
            {
                test: /\.styl$/,
                loader: 'stylint'
            }
        ],
        loaders: [
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                test: /\.jsx?$/,
                loader: 'babel',
                exclude: /(node_modules|bower_components)/
            },
            {
                test: /\.styl$/,
                loader: ExtractTextPlugin.extract(
                    'style',
                    'css?modules&importLoaders=1&localIdentName=[path][name]---[local]---[hash:base64:5]!stylus'
                ),
                exclude: [
                    path.resolve(__dirname, 'src/web/styles')
                ]
            },
            {
                test: /\.styl$/,
                loader: ExtractTextPlugin.extract(
                    'style',
                    'css!stylus'
                ),
                include: [
                    path.resolve(__dirname, 'src/web/styles')
                ]
            },
            {
                test: /\.css$/,
                loader: 'style!css'
            },
            {
                test: /\.(png|jpg)$/,
                loader: 'url',
                query: {
                    limit: 8192
                }
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url',
                query: {
                    limit: 10000,
                    mimetype: 'application/font-woff'
                }
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file'
            }
        ]
    },
    stylus: {
        // nib - CSS3 extensions for Stylus
        use: [nib()],
        // no need to have a '@import "nib"' in the stylesheet
        import: ['~nib/lib/nib/index.styl']
    },
    resolve: {
        alias: {},
        extensions: ['', '.js', '.jsx', '.styl']
    },
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    }
};
