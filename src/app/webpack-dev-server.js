import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';

const webpackDevServer = (app) => {
    const config = require('../../webpack.config.development');

    // https://github.com/webpack/webpack-dev-middleware
    const compiler = webpack(config);
    app.use(webpackDevMiddleware(compiler, {
        noInfo: false,
        quite: false,
        lazy: false,
        // https://webpack.github.io/docs/node.js-api.html#compiler
        watchOptions: {
            poll: true // use polling instead of native watchers
        },
        publicPath: config.output.publicPath,
        stats: {
            colors: true
        }
    }));

    app.use(require('webpack-hot-middleware')(compiler));
};

export default webpackDevServer;
