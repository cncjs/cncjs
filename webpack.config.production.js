const crypto = require('crypto');
const path = require('path');
const boolean = require('boolean');
const dotenv = require('dotenv');
const findImports = require('find-imports');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const without = require('lodash/without');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CSSMinimizerWebpackPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const babelConfig = require('./babel.config');
const buildConfig = require('./build.config');
const pkg = require('./src/package.json');

dotenv.config({
  path: path.resolve('webpack.config.app.production.env')
});

const USE_ESLINT_LOADER = boolean(process.env.USE_ESLINT_LOADER);
const USE_TERSER_PLUGIN = boolean(process.env.USE_TERSER_PLUGIN);
const USE_OPTIMIZE_CSS_ASSETS_PLUGIN = boolean(process.env.USE_OPTIMIZE_CSS_ASSETS_PLUGIN);

// Use publicPath for production
const publicPath = ((payload) => {
  const algorithm = 'sha1';
  const buf = String(payload);
  const hash = crypto.createHash(algorithm).update(buf).digest('hex');
  return '/' + hash.substring(0, 8) + '/'; // 8 digits
})(pkg.version);
const buildVersion = pkg.version;
const timestamp = new Date().getTime();

module.exports = {
  mode: 'production',
  cache: true,
  target: 'web',
  context: path.resolve(__dirname, 'src/app'),
  devtool: 'cheap-module-source-map',
  entry: {
    polyfill: [
      path.resolve(__dirname, 'src/app/polyfill/index.js')
    ],
    vendor: findImports([
      'src/app/**/*.{js,jsx}',
      '!src/app/polyfill/**/*.js',
      '!src/app/**/*.development.js'
    ], { flatten: true }),
    app: [
      path.resolve(__dirname, 'src/app/index.jsx')
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist/cncjs/app'),
    chunkFilename: `[name].[chunkhash].bundle.js?_=${timestamp}`,
    filename: `[name].[chunkhash].bundle.js?_=${timestamp}`,
    publicPath: publicPath
  },
  module: {
    rules: [
      USE_ESLINT_LOADER && {
        test: /\.jsx?$/,
        loader: 'eslint-loader',
        enforce: 'pre',
        exclude: /node_modules/
      },
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        options: babelConfig,
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
              modules: false
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
    ].filter(Boolean)
  },
  optimization: {
    minimizer: [
      USE_TERSER_PLUGIN && (
        new TerserPlugin()
      ),
      USE_OPTIMIZE_CSS_ASSETS_PLUGIN && (
        new CSSMinimizerWebpackPlugin()
      ),
    ].filter(Boolean)
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
        BUILD_VERSION: JSON.stringify(buildVersion),
        LANGUAGES: JSON.stringify(buildConfig.languages),
        TRACKING_ID: JSON.stringify(buildConfig.analytics.trackingId)
      }
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
