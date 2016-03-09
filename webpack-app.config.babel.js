import fs from 'fs';
import path from 'path';

// http://jlongster.com/Backend-Apps-with-Webpack--Part-I
let nodeModules = {};
fs.readdirSync('node_modules')
    .filter((x) => {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach((mod) => {
        nodeModules[mod] = 'commonjs ' + mod;
    });

export default {
    target: 'node',
    context: './src/app',
    entry: {
        index: './index.js'
    },
    output: {
        path: path.join(__dirname, 'dist', 'app'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
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
        __filename: true, // use relative path
        __dirname: true, // use relative path
        setImmediate: true
    }
};
