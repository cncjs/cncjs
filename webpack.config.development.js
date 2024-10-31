const path = require('path');
const dotenv = require('dotenv');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const without = require('lodash/without');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const babelConfig = require('./babel.config');
const buildConfig = require('./build.config');
const pkg = require('./src/package.json');

dotenv.config({
  path: path.resolve('webpack.config.development.env'),
});

const publicPath = process.env.PUBLIC_PATH || '';
const buildVersion = pkg.version;

module.exports = {
  mode: 'development',
  cache: true,
  target: 'web',
  context: path.resolve(__dirname, 'src/app'),
  devtool: 'eval-cheap-module-source-map',
  entry: {
    main: [
      path.resolve(__dirname, 'src/app/index.jsx')
    ],
  },
  output: {
    clean: {
      keep: (asset) => {
        const keep = [
          'assets',
          'favicon.icon',
          'i18n',
          'images',
        ].some(x => asset.startsWith(x));
        return keep;
      },
    },
    path: path.resolve(__dirname, 'output/cncjs/app'),
    filename: '[name].[contenthash].bundle.js',
    pathinfo: true,
    publicPath: publicPath
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        options: {
          ...babelConfig(),
        },
        exclude: /node_modules/
      },
      {
        test: /\.styl$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              localsConvention: 'camelCase',
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
              },
              importLoaders: 1,
            }
          },
          {
            loader: 'stylus-loader',
            options: {
              stylusOptions: {
                use: ['nib'],
                import: ['nib']
              }
            }
          },
        ],
        exclude: [
          path.resolve(__dirname, 'src/app/styles'),
        ]
      },
      {
        test: /\.styl$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              localsConvention: 'camelCase',
              modules: false,
            }
          },
          'stylus-loader'
        ],
        include: [
          path.resolve(__dirname, 'src/app/styles')
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ]
      },
      {
        test: /\.(png|jpg|svg)$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
          esModule: false
        }
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          mimetype: 'application/font-woff',
          esModule: false
        }
      },
      {
        test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
        options: {
          esModule: false
        }
      }
    ].filter(Boolean)
  },
  optimization: {
    minimize: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
        BUILD_VERSION: JSON.stringify(buildVersion),
        LANGUAGES: JSON.stringify(buildConfig.languages),
        TRACKING_ID: JSON.stringify(buildConfig.analytics.trackingId),
      }
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.LoaderOptionsPlugin({
      debug: true
    }),
    new webpack.ContextReplacementPlugin(
      /moment[\/\\]locale$/,
      new RegExp('^\./(' + without(buildConfig.languages, 'en').join('|') + ')$')
    ),
    new ESLintPlugin({
      extensions: ['js', 'jsx'],
      exclude: [
        '/node_modules/',
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
    new HtmlWebpackPlugin({
      filename: 'index.hbs',
      template: path.resolve(__dirname, 'index.hbs'),
    }),
    new ReactRefreshWebpackPlugin(),
  ],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
    },
    extensions: ['.js', '.jsx'],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      fs: false,
      net: false,
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      timers: require.resolve('timers-browserify'),
      tls: false,
    },
    modules: [
      path.resolve(__dirname, 'src'),
      'node_modules'
    ],
  },
  devServer: {
    allowedHosts: 'all',
    compress: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: true,
      },
      progress: true,
    },
    devMiddleware: {
      writeToDisk: true,
    },
    host: process.env.WEBPACK_DEV_SERVER_HOST,
    hot: true,
    liveReload: false,
    proxy: [
      {
        context: ['/api'],
        target: process.env.PROXY_TARGET,
        changeOrigin: true,
      },
      {
        context: ['/socket.io'],
        target: process.env.PROXY_TARGET,
        changeOrigin: true,
      },
    ],
    static: {
      directory: path.resolve(__dirname, 'output/cncjs/app'),
      watch: true,
    },
    watchFiles: [
      'src/app/**/*',
    ],
  },
};
