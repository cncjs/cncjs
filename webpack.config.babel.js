import path from 'path';
import webpack from 'webpack';
import nib from 'nib';

export default {
    cache: true,
    target: 'web',
    entry: {
        app: [
            './src/web/index.jsx'
        ],
        vendor: [
            'async',
            'classnames',
            'gcode-interpreter',
            'gcode-parser',
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
            'react-sortablejs',
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
                exclude: /(node_modules|bower_components)/,
                query: {
                    presets: ['es2015', 'stage-0', 'react'],
                    plugins: [
                        'transform-decorators-legacy'
                    ]
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
