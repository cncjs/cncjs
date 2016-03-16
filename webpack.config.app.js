var fs = require('fs');
var path = require('path');
var webpack = require('webpack');

// http://jlongster.com/Backend-Apps-with-Webpack--Part-I
var nodeModules = {};
fs.readdirSync('node_modules')
    .filter((x) => {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach((mod) => {
        nodeModules[mod] = 'commonjs ' + mod;
    });

module.exports = {
    target: 'node',
    context: './src/app',
    entry: {
        index: [
            './index.js'
        ]
    },
    output: {
        path: path.join(__dirname, 'dist', 'app'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    plugins: [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            compressor: {
                warnings: false
            }
        })
    ],
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                test: /\.jsx?$/,
                loader: 'babel',
                exclude: /node_modules/,
                query: {
                    presets: ['es2015', 'stage-0', 'react'],
                    plugins: []
                }
            }
        ]
    },
    externals: nodeModules,
    resolveLoader: {
        modulesDirectories: [path.resolve(__dirname, 'node_modules')]
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
