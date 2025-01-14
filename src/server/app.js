/* eslint callback-return: 0 */
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import compress from 'compression';
import cookieParser from 'cookie-parser';
import multiparty from 'connect-multiparty';
import connectRestreamer from 'connect-restreamer';
import engines from 'consolidate';
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
import _get from 'lodash/get';
import _noop from 'lodash/noop';
import rimraf from 'rimraf';
import {
  LanguageDetector as i18nextLanguageDetector,
  handle as i18nextHandle
} from 'i18next-express-middleware';
import urljoin from './lib/urljoin';
import logger from './lib/logger';
import settings from './config/settings';
import * as api from './api';
import errclient from './lib/middleware/errclient';
import errlog from './lib/middleware/errlog';
import errnotfound from './lib/middleware/errnotfound';
import errserver from './lib/middleware/errserver';
import config from './services/configstore';
import {
  authorizeIPAddress,
  validateUser
} from './access-control';
import {
  ERR_FORBIDDEN
} from './constants';

const log = logger('app');

const renderPage = (view = 'index', cb = _noop) => (req, res, next) => {
  // Override IE's Compatibility View Settings
  // http://stackoverflow.com/questions/6156639/x-ua-compatible-is-set-to-ie-edge-but-it-still-doesnt-stop-compatibility-mode
  res.set({ 'X-UA-Compatible': 'IE=edge' });

  const locals = { ...cb(req, res) };
  res.render(view, locals);
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

  app.use(async (req, res, next) => {
    try {
      // IP Address Access Control
      const ipaddr = req.ip || req.connection.remoteAddress;
      await authorizeIPAddress(ipaddr);
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

    app.use(async (err, req, res, next) => {
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
          // User Validation
          const user = jwt.verify(token, settings.secret) || {};
          await validateUser(user);
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

  { // Register API routes with public access
    // Also see "src/app/app.js"
    app.post(urljoin(settings.route, 'api/signin'), api.users.signin);
  }

  { // Register API routes with authorized access
    // Version
    app.get(urljoin(settings.route, 'api/version/latest'), api.version.getLatestVersion);

    // State
    app.get(urljoin(settings.route, 'api/state'), api.state.get);
    app.post(urljoin(settings.route, 'api/state'), api.state.set);
    app.delete(urljoin(settings.route, 'api/state'), api.state.unset);

    // Tool Config
    app.get(urljoin(settings.route, 'api/tool'), api.tool.get);
    app.post(urljoin(settings.route, 'api/tool'), api.tool.set);

    // G-code
    app.get(urljoin(settings.route, 'api/gcode'), api.gcode.fetch);
    app.post(urljoin(settings.route, 'api/gcode'), api.gcode.upload);
    app.get(urljoin(settings.route, 'api/gcode/download'), api.gcode.download);
    app.post(urljoin(settings.route, 'api/gcode/download'), api.gcode.download); // Alias

    // Controllers
    app.get(urljoin(settings.route, 'api/controllers'), api.controllers.get);

    // Commands
    app.get(urljoin(settings.route, 'api/commands'), api.commands.fetch);
    app.post(urljoin(settings.route, 'api/commands'), api.commands.create);
    app.get(urljoin(settings.route, 'api/commands/:id'), api.commands.read);
    app.put(urljoin(settings.route, 'api/commands/:id'), api.commands.update);
    app.delete(urljoin(settings.route, 'api/commands/:id'), api.commands.__delete);
    app.post(urljoin(settings.route, 'api/commands/run/:id'), api.commands.run);

    // Events
    app.get(urljoin(settings.route, 'api/events'), api.events.fetch);
    app.post(urljoin(settings.route, 'api/events/'), api.events.create);
    app.get(urljoin(settings.route, 'api/events/:id'), api.events.read);
    app.put(urljoin(settings.route, 'api/events/:id'), api.events.update);
    app.delete(urljoin(settings.route, 'api/events/:id'), api.events.__delete);

    // Machines
    app.get(urljoin(settings.route, 'api/machines'), api.machines.fetch);
    app.post(urljoin(settings.route, 'api/machines'), api.machines.create);
    app.get(urljoin(settings.route, 'api/machines/:id'), api.machines.read);
    app.put(urljoin(settings.route, 'api/machines/:id'), api.machines.update);
    app.delete(urljoin(settings.route, 'api/machines/:id'), api.machines.__delete);

    // Macros
    app.get(urljoin(settings.route, 'api/macros'), api.macros.fetch);
    app.post(urljoin(settings.route, 'api/macros'), api.macros.create);
    app.get(urljoin(settings.route, 'api/macros/:id'), api.macros.read);
    app.put(urljoin(settings.route, 'api/macros/:id'), api.macros.update);
    app.delete(urljoin(settings.route, 'api/macros/:id'), api.macros.__delete);

    // MDI
    app.get(urljoin(settings.route, 'api/mdi'), api.mdi.fetch);
    app.post(urljoin(settings.route, 'api/mdi'), api.mdi.create);
    app.put(urljoin(settings.route, 'api/mdi'), api.mdi.bulkUpdate);
    app.get(urljoin(settings.route, 'api/mdi/:id'), api.mdi.read);
    app.put(urljoin(settings.route, 'api/mdi/:id'), api.mdi.update);
    app.delete(urljoin(settings.route, 'api/mdi/:id'), api.mdi.__delete);

    // Users
    app.get(urljoin(settings.route, 'api/users'), api.users.fetch);
    app.post(urljoin(settings.route, 'api/users/'), api.users.create);
    app.get(urljoin(settings.route, 'api/users/:id'), api.users.read);
    app.put(urljoin(settings.route, 'api/users/:id'), api.users.update);
    app.delete(urljoin(settings.route, 'api/users/:id'), api.users.__delete);

    // Watch
    app.get(urljoin(settings.route, 'api/watch/files'), api.watch.getFiles);
    app.post(urljoin(settings.route, 'api/watch/files'), api.watch.getFiles);
    app.get(urljoin(settings.route, 'api/watch/file'), api.watch.readFile);
    app.post(urljoin(settings.route, 'api/watch/file'), api.watch.readFile);
  }

  // page
  app.get(urljoin(settings.route, '/'), renderPage('index.hbs', (req, res) => {
    const webroot = _get(settings, 'assets.app.routes[0]', ''); // with trailing slash
    const lng = req.language;
    const t = req.t;

    return {
      webroot: webroot,
      lang: lng,
      title: `${t('title')} ${settings.version}`,
      loading: t('loading')
    };
  }));

  { // Error handling
    app.use(errlog());
    app.use(errclient({
      error: 'XHR error'
    }));
    app.use(errnotfound({
      view: path.join('common', '404.hogan'),
      error: 'Not found'
    }));
    app.use(errserver({
      view: path.join('common', '500.hogan'),
      error: 'Internal server error'
    }));
  }

  return app;
};

export default appMain;
