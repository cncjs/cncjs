import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';
import config from '../../webpack.webconfig.development';

const webpackDevServer = (app) => {
    // https://github.com/webpack/webpack-dev-middleware
    const compiler = webpack(config);

    // https://github.com/webpack/webpack-dev-middleware
    // webpack-dev-middleware handle the files in memory.
    app.use(webpackMiddleware(compiler, {
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
