const crypto = require('crypto');
const path = require('path');
const { boolean } = require('boolean');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const dotenv = require('dotenv');
const ESLintPlugin = require('eslint-webpack-plugin');
const findImports = require('find-imports');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const babelConfig = require('./babel.config');
const buildConfig = require('./build.config');
const pkg = require('./src/package.json');

dotenv.config({
  path: path.resolve('webpack.config.production.env'),
});

const USE_TERSER_PLUGIN = boolean(process.env.USE_TERSER_PLUGIN);
const USE_CSS_MINIMIZER_PLUGIN = boolean(process.env.USE_CSS_MINIMIZER_PLUGIN);

// Use publicPath for production
const publicPath = ((payload) => {
  const algorithm = 'sha1';
  const buf = String(payload);
  const hash = crypto.createHash(algorithm).update(buf).digest('hex');
  return '/' + hash.substr(0, 8) + '/'; // 8 digits
})(pkg.version);
const buildVersion = pkg.version;
const timestamp = new Date().getTime();

module.exports = {
  mode: 'production',
  cache: {
    type: 'filesystem',
  },
  target: 'web',
  context: path.resolve(__dirname, 'src/app'),
  devtool: 'cheap-module-source-map',
  entry: {
    polyfill: [
      path.resolve(__dirname, 'src/app/polyfill/index.js'),
    ],
    vendor: findImports([
      'src/app/**/*.{js,jsx}',
      '!src/app/polyfill/**/*.js',
      '!src/app/**/*.development.js'
    ], { flatten: true }),
    app: [
      path.resolve(__dirname, 'src/app/index.jsx'),
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist/cncjs/app'),
    chunkFilename: `[name].[chunkhash].chunk.js?_=${timestamp}`,
    filename: `[name].[contenthash].bundle.js?_=${timestamp}`,
    publicPath: publicPath,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        options: babelConfig(),
        exclude: /node_modules/,
      },
      {
        test: /\.styl$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
                exportLocalsConvention: 'camelCase',
              },
              importLoaders: 1,
              // 0 => no loaders (default)
              // 1 => stylus-loader
            }
          },
          'stylus-loader',
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
              modules: {
                exportLocalsConvention: 'camelCase',
              },
            }
          },
          'stylus-loader',
        ],
        include: [
          path.resolve(__dirname, 'src/app/styles'),
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|jpg|svg)$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
        },
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          mimetype: 'application/font-woff',
        },
      },
      {
        test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
      },
    ].filter(Boolean),
  },
  optimization: {
    minimize: true,
    minimizer: [
      USE_TERSER_PLUGIN && (
        new TerserPlugin()
      ),
      USE_CSS_MINIMIZER_PLUGIN && (
        new CssMinimizerPlugin()
      ),
    ].filter(Boolean)
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      BUILD_VERSION: buildVersion,
      LANGUAGES: buildConfig.languages,
      TRACKING_ID: buildConfig.analytics.trackingId,
    }),
    new ESLintPlugin(),
    new MiniCssExtractPlugin({
      filename: `[name].css?_=${timestamp}`,
      chunkFilename: `[id].css?_=${timestamp}`,
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(__dirname, 'src/app/index.tmpl.html'),
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      'react-spring$': 'react-spring/web.cjs',
      'react-spring/renderprops$': 'react-spring/renderprops.cjs',
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
      'node_modules',
    ],
  },
};
