import webpack from 'webpack';
import WriteFileWebpackPlugin from 'write-file-webpack-plugin';
import webpackDevMiddleware from 'webpack-dev-middleware';
import config from '../../webpack.config.development';

const webpackDevServer = (app) => {
    // https://github.com/webpack/webpack-dev-middleware
    const compiler = webpack({
        ...config,
        plugins: [
            // https://github.com/gajus/write-file-webpack-plugin
            // Forces webpack-dev-server to write bundle files to the file system.
            new WriteFileWebpackPlugin()
        ].concat(config.plugins)
    });

    // https://github.com/webpack/webpack-dev-middleware
    // webpack-dev-middleware handle the files in memory.
    app.use(webpackDevMiddleware(compiler, {
        noInfo: false,
        quite: false,
        lazy: false,
        // https://webpack.github.io/docs/node.js-api.html#compiler
        watchOptions: {
            poll: true, // use polling instead of native watchers
            ignored: /node_modules/
        },
        publicPath: config.output.publicPath,
        stats: {
            colors: true
        }
    }));

    app.use(require('webpack-hot-middleware')(compiler));
};

export default webpackDevServer;
