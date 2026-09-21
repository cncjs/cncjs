const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const pkg = require('./src/package.json');

/**
 * The panel: a second application in the same repository, built from the
 * design mockup rather than migrated out of the old one.
 *
 * It is its own webpack compiler, and that is the whole point of the file.
 * `resolve.alias` is per-compiler, so this is what lets the panel run
 * **React 19** while `src/app` stays on React 17 — the old application is full
 * of `componentWillMount` and dead `@trendmicro` packages and cannot be
 * dragged forward, and the panel should not be held back by it. The two
 * Reacts never meet: separate entries, separate bundles, separate pages.
 *
 * The aliases point at `react19` and `react-dom19`, which are the real
 * packages installed under a different name (`react19@npm:react@19.2.0`).
 * Nothing else in the repository resolves them.
 */
const alias = {
  react$: require.resolve('react19'),
  'react/jsx-runtime': require.resolve('react19/jsx-runtime'),
  'react/jsx-dev-runtime': require.resolve('react19/jsx-dev-runtime'),
  'react-dom$': require.resolve('react-dom19'),
  'react-dom/client': require.resolve('react-dom19/client'),
};

module.exports = ({ mode, outputPath }) => ({
  mode,
  target: 'web',
  context: path.resolve(__dirname, 'src/panel'),
  devtool: mode === 'production' ? 'source-map' : 'eval-cheap-module-source-map',
  entry: {
    panel: [path.resolve(__dirname, 'src/panel/index.jsx')],
  },
  output: {
    clean: true,
    path: outputPath,
    filename: mode === 'production' ? '[name].[contenthash].bundle.js' : '[name].bundle.js',
    // Served from a subdirectory, so every asset reference has to be
    // absolute from the site root rather than relative to the page.
    publicPath: '/panel/',
  },
  resolve: {
    alias: {
      ...alias,
      // The one thing taken from the old application. It is framework-free —
      // socket.io and a protocol — and rewriting it would mean rewriting the
      // part of cncjs that actually talks to a machine.
      'app/lib/controller': path.resolve(__dirname, 'src/app/lib/controller'),
      panel: path.resolve(__dirname, 'src/panel'),
      // Code both applications draw the same thing from. The toolpath
      // arithmetic was inside the old visualiser, on the side of the import
      // boundary the panel may not cross, so it moved here rather than being
      // copied into a second truth.
      lib: path.resolve(__dirname, 'src/lib'),
    },
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
      {
        // The panel's own babel options rather than the repository's shared
        // ones. Two reasons, and both are about not disturbing the old
        // application: the automatic JSX runtime, so components here need no
        // `import React` and compile against React 19's `jsx-runtime`; and no
        // `react-refresh/babel`, which belongs to the other compiler's dev
        // server and would be a plugin with no runtime behind it here.
        test: /\.jsx?$/,
        loader: 'babel-loader',
        options: {
          babelrc: false,
          configFile: false,
          presets: [
            ['@babel/preset-env', { targets: { esmodules: true } }],
            ['@babel/preset-react', { runtime: 'automatic' }],
          ],
        },
        exclude: /node_modules/,
      },
      {
        // Two rules rather than `modules.auto`, which this repository's
        // css-loader 3 does not have: `*.module.css` is scoped to the
        // component that imports it, and everything else stays global. The
        // globals are the token sheet and the reset, which have to be global
        // to be worth anything.
        test: /\.module\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: mode === 'production' ? '[hash:base64:6]' : '[name]__[local]',
              },
            },
          },
        ],
      },
      {
        // The global sheet: the token `:root` and Tailwind's three layers.
        // `postcss-loader` runs Tailwind over it, and `importLoaders: 1` is
        // what makes the `@import './tokens.css'` at the top go through
        // PostCSS too rather than being left to the browser.
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1, modules: false } },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['tailwindcss', { config: path.resolve(__dirname, 'tailwind.panel.config.js') }],
                  'autoprefixer',
                ],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.BUILD_VERSION': JSON.stringify(pkg.version),
    }),
    new ESLintPlugin({
      extensions: ['js', 'jsx'],
      context: path.resolve(__dirname, 'src/panel'),
      failOnError: false,
    }),
    new HtmlWebpackPlugin({
      title: 'CNCjs Panel',
      filename: 'index.html',
      template: path.resolve(__dirname, 'src/panel/index.html'),
      /*
       * A development-only line that puts the review overlay back after the
       * page reloads itself.
       *
       * The overlay is injected by a bookmarklet, so a reload drops it — and
       * it is the overlay that triggers the reload when the bundle changes.
       * Without this the loop quietly breaks: the page comes back, the
       * toolbar does not, and the next note arrives from a version of the
       * tool that is no longer running.
       *
       * It only fires when a session has already opted in by clicking the
       * bookmarklet once, and it is not emitted in a production build at
       * all.
       */
      reviewLoader: mode === 'production' ? '' : `<script>
        try {
          if (sessionStorage.getItem('rv-on') === '1') {
            var s = document.createElement('script');
            s.src = 'http://localhost:8765/overlay.js?' + Date.now();
            document.addEventListener('DOMContentLoaded', function () {
              document.body.appendChild(s);
            });
          }
        } catch (e) { /* private mode */ }
      </script>`,
    }),
  ],
});
