const path = require('path');
const dotenv = require('dotenv');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const without = require('lodash/without');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const babelConfig = require('./babel.config');
const buildConfig = require('./build.config');
const pkg = require('./src/package.json');

dotenv.config();

const publicPath = process.env.PUBLIC_PATH || '';
const buildVersion = pkg.version;
const timestamp = new Date().getTime();

module.exports = {
  mode: 'development',
  cache: true,
  target: 'web',
  context: path.resolve(__dirname, 'src/app'),
  devtool: 'eval-cheap-module-source-map',
  entry: {
    polyfill: path.resolve(__dirname, 'src/app/polyfill/index.js'),
    app: path.resolve(__dirname, 'src/app/index.jsx')
  },
  output: {
    path: path.resolve(__dirname, 'output/cncjs/app'),
    chunkFilename: `[name].[hash].bundle.js?_=${timestamp}`,
    filename: `[name].[hash].bundle.js?_=${timestamp}`,
    pathinfo: true,
    publicPath: publicPath
  },
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
        options: {
          ...babelConfig,
          env: {
            development: {
              plugins: ['react-hot-loader/babel']
            }
          }
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
          }
        ],
        exclude: [
          path.resolve(__dirname, 'src/app/styles')
        ]
      },
      {
        test: /\.styl$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: false,
              localsConvention: 'camelCase',
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
          'css-loader'
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
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
        BUILD_VERSION: JSON.stringify(buildVersion),
        LANGUAGES: JSON.stringify(buildConfig.languages),
        TRACKING_ID: JSON.stringify(buildConfig.analytics.trackingId)
      }
    }),
    new webpack.LoaderOptionsPlugin({
      debug: true
    }),
    new webpack.ContextReplacementPlugin(
      /moment[\/\\]locale$/,
      new RegExp('^\./(' + without(buildConfig.languages, 'en').join('|') + ')$')
    ),
    // Generates a manifest.json file in your root output directory with a mapping of all source file names to their corresponding output file.
    new WebpackManifestPlugin({
      fileName: 'manifest.json'
    }),
    new MiniCssExtractPlugin({
      filename: `[name].css?_=${timestamp}`,
      chunkFilename: `[id].css?_=${timestamp}`
    }),
    new HtmlWebpackPlugin({
      filename: 'index.hbs',
      template: path.resolve(__dirname, 'index.hbs'),
    })
  ],
  resolve: {
    modules: [
      path.resolve(__dirname, 'src'),
      'node_modules'
    ],
    fallback: {
      fs: false,
      net: false,
      path: false,
      stream: require.resolve('stream-browserify'),
      timers: false,
      tls: false,
    },
    extensions: ['.js', '.jsx']
  }
};
