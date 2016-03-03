import fs from 'fs';
import path from 'path';
import webpack from 'webpack';

// https://github.com/react-bootstrap/react-router-bootstrap/blob/master/webpack.config.babel.js
// https://github.com/choonkending/react-webpack-node/blob/master/webpack/webpack.config.dev.js
// http://jlongster.com/Backend-Apps-with-Webpack--Part-I
// http://stackoverflow.com/questions/31102035/how-can-i-use-webpack-with-express

const env = (process.NODE_ENV === 'production') ? 'production' : 'development';

let nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

export default [
    {
        name: 'server',
        target: 'node',
        entry: [
            './src/app/cncserver.js',
            './src/app/app.js'
        ],
        output: {
            path: path.join(__dirname, 'dist', 'app'),
            filename: '[name].js'
        },
        module: {
            loaders: [
                {
                    test: /\.js?$/,
                    loader: 'babel',
                    query: {
                        presets: ['es2015', 'stage-0', 'react'],
                        plugins: []
                    }
                },
                {
                    test:  /\.json$/,
                    loader: 'json'
                }
            ]
        },
        externals: nodeModules,
        devtool: 'sourcemap'
    },
    {
        name: 'browser',
        target: 'web',
        entry: {
            app: './src/web/index.jsx'
        },
        output: {
            path: path.join(__dirname, 'dist', 'web'),
            filename: '[name].js'
        },
        module: {
            loaders: [
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
            use: [require('nib')()],
            import: ['~nib/lib/nib/index.styl']
        },
        resolve: {
            alias: {
                // FIXME
                'i18next-browser-languagedetector': 'i18next-browser-languagedetector/lib/index.js',
                'i18next-xhr-backend': 'i18next-xhr-backend/lib/index.js'
            },
            extensions: ['', '.js', '.jsx', '.styl']
        },
        node: {
            fs: 'empty'
        }
    }
];
