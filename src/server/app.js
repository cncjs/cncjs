/* eslint callback-return: 0 */
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import chalk from 'chalk';
import compress from 'compression';
import cookieParser from 'cookie-parser';
import multiparty from 'connect-multiparty';
import connectRestreamer from 'connect-restreamer';
import consolidate from 'consolidate';
import { ensureArray } from 'ensure-type';
import errorhandler from 'errorhandler';
import express from 'express';
import {
  expressjwt,
  UnauthorizedError as ExpressJWTUnauthorizedError,
} from 'express-jwt';
import session from 'express-session';
import i18next from 'i18next';
import i18nextFSBackend from 'i18next-fs-backend';
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
} from 'i18next-http-middleware';
import urljoin from './lib/urljoin';
import logger from './lib/logger';
import settings from './config/settings';
import * as accessControl from './lib/access-control';
import { createPublicApiRouter, createProtectedApiRouter } from './routes/api';
import { createExceptionRouter } from './routes/exception';
import { createPublicViewRouter } from './routes/view';
import {
  ERR_UNAUTHORIZED,
} from './constants';
import serviceContainer from './service-container';

const userStore = serviceContainer.resolve('userStore');

const log = logger('app');

const ipAddressAccessControlMiddleware = () => (req, res, next) => {
  const ipaddr = req.ip || req.connection.remoteAddress;
  const pass = accessControl.isAllowedIPAddress(ipaddr);
  if (!pass) {
    const err = {
      message: `Client with IP address ${ipaddr} is not allowed to access the server`,
      code: 'unauthorized_ip_address',
      status: ERR_UNAUTHORIZED,
    };
    log.warn(`${chalk.redBright('Unauthorized Error')}: ipaddr=${chalk.yellow(ipaddr)}, message=${chalk.yellow(JSON.stringify(err.message))}, code=${chalk.yellow(err.code)}, status=${chalk.yellow(err.status)}`);
    res.status(err.status).end(`Unauthorized Error: ${err.message}`);
    return;
  }

  next();
};

const jwtAuthenticationMiddleware = () => {
  const secret = userStore.get('secret');

  return expressjwt({
    secret,
    algorithms: ['HS256'],
    credentialsRequired: true,
    getToken: (req) => {
      if (req.headers && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        const [scheme, credentials] = parts;

        if (/^Bearer$/i.test(scheme)) {
          const token = credentials;
          return token;
        }
      }

      if (req.query && req.query.token) {
        const token = req.query.token;
        return token;
      }

      if (req.body && req.body.token) {
        const token = req.body.token;
        return token;
      }

      return null;
    },
    requestProperty: 'user',
  });
};

const jwtAuthorizationMiddleware = () => (err, req, res, next) => {
  try {
    if (err && (err instanceof ExpressJWTUnauthorizedError)) {
      throw err;
    }

    if (!req.user) {
      throw new ExpressJWTUnauthorizedError('missing_decoded_token', { message: 'The decoded token is not attached to the result object' });
    }

    { // validate the user
      const { id = null, name = null } = { ...req.user };
      const users = ensureArray(userStore.get('users'));
      const enabledUsers = users
        .filter(user => _isPlainObject(user))
        .map(user => ({
          ...user,
          // defaults to true if not explicitly initialized
          enabled: (user.enabled !== false)
        }))
        .filter(user => user.enabled);
      if ((enabledUsers.length > 0) && !_find(enabledUsers, { id: id, name: name })) {
        throw new ExpressJWTUnauthorizedError('user_not_found', { message: 'User not found' });
      }
    }
  } catch (err) {
    const ipaddr = req.ip || req.connection.remoteAddress;
    log.warn(`${chalk.redBright('Unauthorized Error')}: ipaddr=${chalk.yellow(ipaddr)}, message=${chalk.yellow(JSON.stringify(err.message))}, code=${chalk.yellow(err.code)}, status=${chalk.yellow(err.status)}`);
    res.status(err.status).end(`Unauthorized Error: ${err.message}`);
    return;
  }

  next();
};

const appMain = () => {
  const app = express();

  { // Settings
    if (process.env.NODE_ENV === 'development') {
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

    app.engine('html', consolidate.hogan);
    app.engine('hogan', consolidate.hogan);

    app.set('view engine', 'html');
    app.set('views', [
      path.resolve(__dirname, '../app'),
      path.resolve(__dirname, 'views')
    ]); // The view directory path

    log.debug('app.settings: %j', app.settings);
  }

  // Setup i18n (i18next)
  i18next
    .use(i18nextFSBackend)
    .use(i18nextLanguageDetector)
    .init(settings.i18next);

  // IP address access control
  app.use(ipAddressAccessControlMiddleware());

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

  // Connect's body parsing middleware. This only handles urlencoded and json bodies.
  // https://github.com/expressjs/body-parser
  app.use(bodyParser.json(settings.middleware['body-parser'].json));
  app.use(bodyParser.urlencoded(settings.middleware['body-parser'].urlencoded));

  app.use(cookieParser());

  // multipart bodies
  // - [multiparty](https://github.com/andrewrk/node-multiparty)
  // - [connect-multiparty](https://github.com/andrewrk/connect-multiparty)
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

  app.use(i18nextHandle(i18next, {}));

  const apiPrefix = urljoin(settings.route, 'api');

  const publicApiRouter = createPublicApiRouter();
  app.use(apiPrefix, publicApiRouter);

  const protectedApiRouter = createProtectedApiRouter();
  app.use(apiPrefix, jwtAuthenticationMiddleware(), jwtAuthorizationMiddleware(), protectedApiRouter);

  const publicViewRouter = createPublicViewRouter();
  app.use(settings.route, publicViewRouter);

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

  const exceptionRouter = createExceptionRouter();
  app.use(settings.route, exceptionRouter);

  return app;
};

export default appMain;
