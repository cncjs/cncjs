process.env.NODE_ENV = 'development';

/* eslint prefer-arrow-callback: 0 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json');

const NODE_MODULES = path.resolve(__dirname, 'node_modules');

// http://jlongster.com/Backend-Apps-with-Webpack--Part-I
const externals = {};
fs.readdirSync(NODE_MODULES)
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        externals[mod] = 'commonjs ' + mod;
    });

// Use publicPath for production
const payload = pkg.version;
const publicPath = (function(payload) {
    const algorithm = 'sha1';
    const buf = String(payload);
    const hash = crypto.createHash(algorithm).update(buf).digest('hex');
    return '/' + hash.substr(0, 8) + '/'; // 8 digits
}(payload));

module.exports = {
    devtool: 'cheap-module-eval-source-map',
    target: 'node',
    context: path.resolve(__dirname, 'src/app'),
    entry: {
        index: [
            //'webpack/hot/poll?1000',
            './index.js'
        ]
    },
    output: {
        path: path.resolve(__dirname, 'output/app'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    plugins: [
        new webpack.DefinePlugin({
            'global.PUBLIC_PATH': JSON.stringify(publicPath)
        }),
        //new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin()
    ],
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'eslint-loader',
                enforce: 'pre',
                exclude: /node_modules/
            },
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    externals: externals,
    resolve: {
        extensions: ['.js', '.jsx']
    },
    resolveLoader: {
        modules: [NODE_MODULES]
    },
    node: {
        console: true,
        global: true,
        process: true,
        Buffer: true,
        __filename: true, // Use relative path
        __dirname: true, // Use relative path
        setImmediate: true
    }
};
