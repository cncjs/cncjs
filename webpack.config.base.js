/* eslint no-var: 0 */
var nib = require('nib');
var path = require('path');
var webpack = require('webpack');
var findImports = require('find-imports');

module.exports = {
    cache: true,
    target: 'web',
    entry: {
        app: [
            path.resolve(__dirname, 'src/web/index.jsx')
        ],
        vendor: findImports('src/web/**/*.{js,jsx}', { flatten: true })
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js')
    ],
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
                loaders: [
                    'style',
                    'css?modules&importLoaders=1&localIdentName=[path]___[name]__[local]___[hash:base64:5]',
                    'stylus'
                ],
                exclude: [
                    path.resolve(__dirname, 'src/web/styles')
                ]
            },
            {
                test: /\.styl$/,
                loaders: [
                    'style',
                    'css',
                    'stylus'
                ],
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
    node: {
        fs: 'empty'
    }
};
