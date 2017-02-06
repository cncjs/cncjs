/* eslint no-var: 0 */
var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    cache: true,
    target: 'web',
    context: path.resolve(__dirname, 'src/web'),
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                use: 'eslint-loader',
                enforce: 'pre',
                exclude: /node_modules/
            },
            {
                test: /\.styl$/,
                use: 'stylint-loader',
                enforce: 'pre'
            },
            {
                test: /\.jsx?$/,
                use: 'babel-loader',
                exclude: /(node_modules|bower_components)/
            },
            {
                test: /\.styl$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: 'css-loader?camelCase&modules&importLoaders=1&localIdentName=[path][name]__[local]--[hash:base64:5]!stylus-loader'
                }),
                exclude: [
                    path.resolve(__dirname, 'src/web/styles')
                ]
            },
            {
                test: /\.styl$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: 'css-loader?camelCase!stylus-loader'
                }),
                include: [
                    path.resolve(__dirname, 'src/web/styles')
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.(png|jpg)$/,
                use: 'url-loader',
                options: {
                    limit: 8192
                }
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: 'url-loader',
                options: {
                    limit: 10000,
                    mimetype: 'application/font-woff'
                }
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: 'file-loader'
            }
        ]
    },
    resolve: {
        modules: [
            path.resolve(__dirname, 'src/web'),
            'node_modules'
        ],
        extensions: ['.js', '.json', '.jsx', '.styl']
    },
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    }
};
