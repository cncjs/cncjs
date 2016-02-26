import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import connect from 'connect';
import express from 'express';
import engines from 'consolidate';
import errorhandler from 'errorhandler';
import favicon from 'serve-favicon';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import multiparty from 'connect-multiparty';
import connectRestreamer from 'connect-restreamer';
import methodOverride from 'method-override';
import morgan from 'morgan';
import compress from 'compression';
import serveStatic from 'serve-static';
import i18next from 'i18next';
import i18nextBackend from 'i18next-node-fs-backend';
import {
    LanguageDetector as i18nextLanguageDetector,
    handle as i18nextHandle
} from 'i18next-express-middleware';
import urljoin from './lib/urljoin';
import log from './lib/log';
import settings from './config/settings';
import api from './api';

let middleware = {};
// Auto load middleware
fs.readdirSync(__dirname + '/lib/middleware').forEach((filename) => {
    if ( ! /\.js$/.test(filename)) {
        return;
    }
    let name = path.basename(filename, '.js');
    middleware[name] = require('./lib/middleware/' + name);
});

const renderPage = (req, res, next) => {
    let view = req.params[0] || 'index';
    let file = view + '.hbs';

    if (fs.existsSync(path.resolve(__dirname, 'views', file))) {
        let cdn, webroot, version;

        // cdn
        if (_.isEmpty(settings.cdn.uri)) {
            cdn = urljoin(settings.assets['web'].routes[0], '/'); // with trailing slash
        } else {
            cdn = urljoin(settings.cdn.uri, settings.assets['web'].routes[0], '/'); // with trailing slash
        }

        // webroot
        webroot = urljoin(settings.assets['web'].routes[0], '/'); // with trailing slash

        // version
        version = settings.version;

        let lng = req.language;
        let lngs = req.languages;
        let t = req.t;

        // Override IE's Compatibility View Settings
        // http://stackoverflow.com/questions/6156639/x-ua-compatible-is-set-to-ie-edge-but-it-still-doesnt-stop-compatibility-mode
        res.set({ 'X-UA-Compatible': 'IE=edge' });

        res.render(file, {
            'cdn': cdn,
            'webroot': webroot,
            'version': version,
            'lang': lng,
            'title': t('title'),
            'dir': t('config:dir'),
            'loading': t('loading'),
            partials: {
                loading: 'loading' // views/loading.hbs
            }
        });

        return;
    }

    next();
};

const appMain = () => {
    let app = express();

    // Setup i18n (i18next)
    i18next
        .use(i18nextBackend)
        .use(i18nextLanguageDetector)
        .init(settings.i18next);

    {  // Settings
        if (settings.env === 'development') {
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

        for (let i = 0; i < settings.view.engines.length; ++i) {
            let extension = settings.view.engines[i].extension;
            let template = settings.view.engines[i].template;
            app.engine(extension, engines[template]);
        }
        app.set('view engine', settings.view.defaultExtension); // The default engine extension to use when omitted
        app.set('views', path.join(__dirname, 'views')); // The view directory path

        log.debug('app.settings: %j', app.settings);
    }

    // Removes the 'X-Powered-By' header in earlier versions of Express
    app.use((req, res, next) => {
        res.removeHeader('X-Powered-By');
        next();
    });

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
    app.use(connectRestreamer());

    app.use(methodOverride());
    if (settings.verbosity > 0) {
        app.use(morgan(settings.middleware['morgan']));
    }
    app.use(compress(settings.middleware['compression']));

    _.each(settings.assets, (asset, name) => {
        log.debug('assets: name=%s, asset=%s', name, JSON.stringify(asset));

        if (!(asset.path)) {
            log.error('asset path is not defined');
            return;
        }

        _.each(asset.routes, (asset_route) => {
            let route = urljoin(settings.route || '/', asset_route || '');
            log.debug('> route=%s', name, route);
            app.use(route, serveStatic(asset.path, {
                maxAge: asset.maxAge
            }));
        });
    });

    app.use(i18nextHandle(i18next, {}));

    // api
    api.addRoutes(app);

    // page
    app.get(urljoin(settings.route, '*'), renderPage);

    { // Error handling
        let { err_log, err_client, err_notfound, err_server } = middleware;

        app.use(err_log());
        app.use(err_client({
            error: 'XHR error'
        }));
        app.use(err_notfound({
            view: path.join('common', '404.hogan'),
            error: 'Not found'
        }));
        app.use(err_server({
            view: path.join('common', '500.jade'),
            error: 'Internal server error'
        }));
    }

    return app;
};

export default appMain;
