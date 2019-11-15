/* eslint callback-return: 0 */
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import compress from 'compression';
import cookieParser from 'cookie-parser';
import multiparty from 'connect-multiparty';
import connectRestreamer from 'connect-restreamer';
import engines from 'consolidate';
import ensureArray from 'ensure-array';
import errorhandler from 'errorhandler';
import express from 'express';
import expressJwt from 'express-jwt';
import session from 'express-session';
import 'hogan.js'; // required by consolidate
import i18next from 'i18next';
import i18nextBackend from 'i18next-node-fs-backend';
import jwt from 'jsonwebtoken';
import methodOverride from 'method-override';
import morgan from 'morgan';
import favicon from 'serve-favicon';
import serveStatic from 'serve-static';
import sessionFileStore from 'session-file-store';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _isPlainObject from 'lodash/isPlainObject';
import rimraf from 'rimraf';
import {
    LanguageDetector as i18nextLanguageDetector,
    handle as i18nextHandle,
} from 'i18next-express-middleware';
import urljoin from './lib/urljoin';
import logger from './lib/logger';
import settings from './config/settings';
import {
    isAllowedIPAddress,
} from './lib/access-control';
import { createAPIRouter } from './routes/api';
import { createExceptionRouter } from './routes/exception';
import { createViewRouter } from './routes/view';
import {
    ERR_FORBIDDEN,
} from './constants';
import serviceContainer from './service-container';

const config = serviceContainer.resolve('config');

const log = logger('app');

const appMain = () => {
    const app = express();

    { // Settings
        if (process.env.NODE_ENV === 'development') {
            const webpackDevServer = require('./webpack-dev-server').default;
            webpackDevServer(app);

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
            const extension = settings.view.engines[i].extension;
            const template = settings.view.engines[i].template;
            app.engine(extension, engines[template]);
        }
        app.set('view engine', settings.view.defaultExtension); // The default engine extension to use when omitted
        app.set('views', [
            path.resolve(__dirname, '../app'),
            path.resolve(__dirname, 'views')
        ]); // The view directory path

        log.debug('app.settings: %j', app.settings);
    }

    // Setup i18n (i18next)
    i18next
        .use(i18nextBackend)
        .use(i18nextLanguageDetector)
        .init(settings.i18next);

    app.use((req, res, next) => {
        try {
            const ipaddr = req.ip || req.connection.remoteAddress;

            { // IP address access control
                const pass = isAllowedIPAddress(ipaddr);
                if (!pass) {
                    throw new Error(`Client with IP address '${ipaddr}' is not allowed to access the server.`);
                }
            }
        } catch (err) {
            log.warn(err);
            res.status(ERR_FORBIDDEN).end('Forbidden Access');
            return;
        }

        next();
    });

    // Removes the 'X-Powered-By' header in earlier versions of Express
    app.use((req, res, next) => {
        res.removeHeader('X-Powered-By');
        next();
    });

    // Middleware
    // https://github.com/senchalabs/connect

    try {
        // https://github.com/valery-barysok/session-file-store
        const path = settings.middleware.session.path; // Defaults to './cncjs-sessions'

        rimraf.sync(path);
        fs.mkdirSync(path);

        const FileStore = sessionFileStore(session);
        app.use(session({
            // https://github.com/expressjs/session#secret
            secret: settings.secret,

            // https://github.com/expressjs/session#resave
            resave: true,

            // https://github.com/expressjs/session#saveuninitialized
            saveUninitialized: true,

            store: new FileStore({
                path: path,
                logFn: (...args) => {
                    log.debug.apply(log, args);
                }
            })
        }));
    } catch (err) {
        log.error(err);
    }

    app.use(favicon(path.join(_get(settings, 'assets.app.path', ''), 'favicon.ico')));
    app.use(cookieParser());

    // Connect's body parsing middleware. This only handles urlencoded and json bodies.
    // https://github.com/expressjs/body-parser
    app.use(bodyParser.json(settings.middleware['body-parser'].json));
    app.use(bodyParser.urlencoded(settings.middleware['body-parser'].urlencoded));

    // For multipart bodies, please use the following modules:
    // - [busboy](https://github.com/mscdex/busboy) and [connect-busboy](https://github.com/mscdex/connect-busboy)
    // - [multiparty](https://github.com/andrewrk/node-multiparty) and [connect-multiparty](https://github.com/andrewrk/connect-multiparty)
    app.use(multiparty(settings.middleware.multiparty));

    // https://github.com/dominictarr/connect-restreamer
    // connect's bodyParser has a problem when using it with a proxy.
    // It gobbles up all the body events, so that the proxy doesn't see anything!
    app.use(connectRestreamer());

    // https://github.com/expressjs/method-override
    app.use(methodOverride());
    if (settings.verbosity > 0) {
        // https://github.com/expressjs/morgan#use-custom-token-formats
        // Add an ID to all requests and displays it using the :id token
        morgan.token('id', (req, res) => {
            return req.session.id;
        });
        app.use(morgan(settings.middleware.morgan.format));
    }
    app.use(compress(settings.middleware.compression));

    Object.keys(settings.assets).forEach((name) => {
        const asset = settings.assets[name];

        log.debug('assets: name=%s, asset=%s', name, JSON.stringify(asset));
        if (!(asset.path)) {
            log.error('asset path is not defined');
            return;
        }

        asset.routes.forEach((assetRoute) => {
            const route = urljoin(settings.route || '/', assetRoute || '');
            log.debug('> route=%s', name, route);
            app.use(route, serveStatic(asset.path, {
                maxAge: asset.maxAge
            }));
        });
    });

    app.use(i18nextHandle(i18next, {}));

    { // Secure API Access
        app.use(urljoin(settings.route, 'api'), expressJwt({
            secret: config.get('secret'),
            credentialsRequired: true
        }));

        app.use((err, req, res, next) => {
            let bypass = !(err && (err.name === 'UnauthorizedError'));

            // Check whether the app is running in development mode
            bypass = bypass || (process.env.NODE_ENV === 'development');

            // Check whether the request path is not restricted
            const whitelist = [
                // Also see "src/app/api/index.js"
                urljoin(settings.route, 'api/signin')
            ];
            bypass = bypass || whitelist.some(path => {
                return req.path.indexOf(path) === 0;
            });

            if (!bypass) {
                // Check whether the provided credential is correct
                const token = _get(req, 'query.token') || _get(req, 'body.token');
                try {
                    const user = jwt.verify(token, settings.secret) || {};

                    { // Validate the user
                        const { id = null, name = null } = { ...user };
                        const users = ensureArray(config.get('users'))
                            .filter(user => _isPlainObject(user))
                            .map(user => ({
                                ...user,
                                // Defaults to true if not explicitly initialized
                                enabled: (user.enabled !== false)
                            }));
                        const enabledUsers = users.filter(user => user.enabled);
                        if ((enabledUsers.length > 0) && !_find(enabledUsers, { id: id, name: name })) {
                            throw new Error(`Unauthorized user: user.id=${id}, user.name=${name}`);
                        }
                    }

                    bypass = true;
                } catch (err) {
                    log.warn(err);
                }
            }

            if (!bypass) {
                const ipaddr = req.ip || req.connection.remoteAddress;
                log.warn(`Forbidden: ipaddr=${ipaddr}, code="${err.code}", message="${err.message}"`);
                res.status(ERR_FORBIDDEN).end('Forbidden Access');
                return;
            }

            next();
        });
    }

    const apiRouter = createAPIRouter();
    app.use(settings.route, apiRouter);

    const viewRouter = createViewRouter();
    app.use(settings.route, viewRouter);

    const exceptionRouter = createExceptionRouter();
    app.use(settings.route, exceptionRouter);

    return app;
};

export default appMain;
