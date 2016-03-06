import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import nib from 'nib';

// https://github.com/react-bootstrap/react-router-bootstrap/blob/master/webpack.config.babel.js
// https://github.com/choonkending/react-webpack-node/blob/master/webpack/webpack.config.dev.js
// http://jlongster.com/Backend-Apps-with-Webpack--Part-I
// http://stackoverflow.com/questions/31102035/how-can-i-use-webpack-with-express
// https://github.com/webpack/webpack-with-common-libs/blob/master/webpack.config.js

export default {
    cache: true,
    entry: {
        app: './src/web/index.jsx',
        vendor: [
            'async',
            'classnames',
            'gcode-interpreter',
            'gcode-parser',
            'history',
            'i18next',
            'jsuri',
            'lodash',
            'moment',
            'pubsub-js',
            'rc-slider',
            'rc-switch',
            'react',
            'react-dom',
            'react-addons-update',
            'react-bootstrap',
            'react-datagrid',
            'react-dom',
            'react-datagrid',
            'react-dropzone',
            'react-infinite',
            'react-router',
            'react-select',
            'request',
            'sha1',
            'sortablejs',
            'stacktrace-js',
            'three'
        ]
    },
    output: {
        path: path.join(__dirname, 'dist', 'web'),
        filename: '[name].js'
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js')
    ],
    module: {
        // Problem with amd modules: "define cannot be used indirect"
        // https://github.com/webpack/webpack/issues/138
        noParse: /node_modules\/json-schema\/lib\/validate\.js/,
        preLoaders: [
            // http://survivejs.com/webpack_react/linting_in_webpack/
            {
                test: /\.jsx?$/,
                loaders: ['eslint'],
                exclude: /node_modules/
            }
        ],
        loaders: [
            {
                test:  /\.json$/,
                loader: 'json'
            },
            {
                test: /\.jsx?$/,
                loader: 'babel',
                exclude: /(node_modules|bower_components)/,
                query: {
                    presets: ['es2015', 'stage-0', 'react'],
                    plugins: []
                }
            },
            {
                test: /\.styl$/,
                loader: 'style!css!stylus'
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
        use: [nib()],
        import: ['~nib/lib/nib/index.styl']
    },
    resolve: {
        alias: {
            // FIXME
            'i18next-browser-languagedetector': 'i18next-browser-languagedetector/lib/index.js',
            'i18next-xhr-backend': 'i18next-xhr-backend/lib/index.js'
        },
        extensions: ['', '.js', '.jsx', '.styl'],
    },
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    }
};
