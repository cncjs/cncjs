import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import logger from './lib/logger';

const log = logger('webpack-dev-server');

const webpackDevServer = (app) => {
    if (process.env.NODE_ENV !== 'development') {
        log.error('The process.env.NODE_ENV should be "development" while running a webpack server');
        return;
    }

    const webpackConfig = require('../../webpack.config.app.development');
    const compiler = webpack(webpackConfig);

    // https://github.com/webpack/webpack-dev-middleware
    // webpack-dev-middleware handle the files in memory.
    app.use(webpackDevMiddleware(compiler, {
        lazy: false,
        // https://webpack.github.io/docs/node.js-api.html#compiler
        watchOptions: {
            poll: true, // use polling instead of native watchers
            ignored: /node_modules/
        },
        publicPath: webpackConfig.output.publicPath,
        stats: {
            colors: true
        }
    }));

    app.use(webpackHotMiddleware(compiler, {
        path: '/__webpack_hmr',
        heartbeat: 10 * 1000
    }));
};

export default webpackDevServer;
