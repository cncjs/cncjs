//
// Module dependencies
//
var fs = require('fs'),
    path = require('path'),
    connect = require('connect'),
    express = require('express'),
    engines = require('consolidate'),
    i18n = require('i18next'),
    urljoin = require('./lib/urljoin'),
    _ = require('lodash'),
    log = require('./lib/log'),
    settings = require('./config/settings');

// Auto-load bundled middleware
var middleware = {};

fs.readdirSync(__dirname + '/lib/middleware').forEach(function(filename) {
    if ( ! /\.js$/.test(filename)) {
        return;
    }
    var name = path.basename(filename, '.js');
    middleware[name] = require('./lib/middleware/' + name);
});

module.exports = function() {
    // Main app
    var app = express();
    var errorhandler = require('errorhandler');
    var favicon = require('serve-favicon');
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    //var busboy = require('connect-busboy');
    var multiparty = require('connect-multiparty');
    var methodOverride = require('method-override');
    var morgan = require('morgan');
    var compress = require('compression');
    var serveStatic = require('serve-static');

    // Setup i18n (i18next)
    i18n.init(settings.i18next);
    i18n.registerAppHelper(app); // Register app.locals (app.helper)

    // Settings
    (function(app) {
        var env = process.env.NODE_ENV || 'development';
        if ('development' === env) {
            // Error handler - https://github.com/expressjs/errorhandler
            // Development error handler, providing stack traces and error message responses
            // for requests accepting text, html, or json.
            app.use(errorhandler());

            // a custom "verbose errors" setting which can be used in the templates via settings['verbose errors']
            app.enable('verbose errors'); // Enables verbose errors in development
            app.disable('view cache'); // Disables view template compilation caching in development
        } else {
            // a custom "verbose errors" setting which can be used in the templates via settings['verbose errors']
            app.disable('verbose errors'); // Disables verbose errors in production
            app.enable('view cache'); // Enables view template compilation caching in production
        }

        app.enable('trust proxy'); // Enables reverse proxy support, disabled by default
        app.enable('case sensitive routing'); // Enable case sensitivity, disabled by default, treating "/Foo" and "/foo" as the same
        app.disable('strict routing'); // Enable strict routing, by default "/foo" and "/foo/" are treated the same by the router
        app.disable('x-powered-by'); // Enables the X-Powered-By: Express HTTP header, enabled by default

        for (var i = 0; i < settings.view.engines.length; ++i) {
            var extension = settings.view.engines[i].extension;
            var template = settings.view.engines[i].template;
            app.engine(extension, engines[template]);
        }
        app.set('view engine', settings.view.defaultExtension); // The default engine extension to use when omitted
        app.set('views', path.join(__dirname, 'views')); // The view directory path

        log.info('app.settings: %j', app.settings);
    }(app));

    // Removes the 'X-Powered-By' header in earlier versions of Express
    app.use(function (req, res, next) {
        res.removeHeader('X-Powered-By');
        next();
    });

    // Cross-origin resource sharing
    //app.use(middleware.cors());

    // Middleware
    // https://github.com/senchalabs/connect
    app.use(favicon(path.join(__dirname, '../web/favicon.ico')));
    app.use(cookieParser());

    // Connect's body parsing middleware. This only handles urlencoded and json bodies.
    // https://github.com/expressjs/body-parser
    app.use(bodyParser.json(settings.middleware['body-parser']['json']));
    app.use(bodyParser.urlencoded(settings.middleware['body-parser']['urlencoded']));

    // For multipart bodies, please use the following modules:
    // - [busboy](https://github.com/mscdex/busboy) and [connect-busboy](https://github.com/mscdex/connect-busboy)
    // - [multiparty](https://github.com/andrewrk/node-multiparty) and [connect-multiparty](https://github.com/andrewrk/connect-multiparty)
    app.use(multiparty(settings.middleware['multiparty']));

    // https://github.com/dominictarr/connect-restreamer
    // connect's bodyParser has a problem when using it with a proxy.
    // It gobbles up all the body events, so that the proxy doesn't see anything!
    app.use(require('connect-restreamer')());

    app.use(methodOverride());
    app.use(morgan(settings.middleware['morgan']));
    app.use(compress(settings.middleware['compression']));

    _.each(settings.assets, function(asset, name) {
        log.info('assets: name=%s, asset=%s', name, JSON.stringify(asset));

        if ( ! asset.path) {
            log.error('asset path is not defined');
            return;
        }

        _.each(asset.routes, function(asset_route) {
            var route = urljoin(settings.route || '/', asset_route || '');
            log.info('> route=%s', name, route);
            app.use(route, serveStatic(asset.path, {
                maxAge: asset.maxAge
            }));
        });
    });

    // i18n routing
    app.use(i18n.handle);

    // https://github.com/visionmedia/express/wiki/New-features-in-4.x
    // No more app.use(app.router)
    // All routing methods will be added in the order in which they appear. You should not do app.use(app.router). This eliminates the most common issue with Express.
    var routes = require('./routes/main');
    routes.init(app);

    // Error handling
    console.assert( ! _.isUndefined(middleware.err_log), 'lib/middleware/err_log not found');
    console.assert( ! _.isUndefined(middleware.err_client), 'lib/middleware/err_client not found');
    console.assert( ! _.isUndefined(middleware.err_notfound), 'lib/middleware/err_notfound not found');
    console.assert( ! _.isUndefined(middleware.err_server), 'lib/middleware/err_server not found');

    app.use(middleware.err_log());
    app.use(middleware.err_client({
        error: 'XHR error'
    }));
    app.use(middleware.err_notfound({
        view: path.join('common', '404.hogan'),
        error: 'Not found'
    }));
    app.use(middleware.err_server({
        view: path.join('common', '500.jade'),
        error: 'Internal server error'
    }));

    return app;
};
