/* eslint import/no-dynamic-require: 0 */
import { EventEmitter } from 'events';
import express from 'express';
import http from 'http';
import path from 'path';
import serveStatic from 'serve-static';

const createMultihost = ({ hosts, route, server }) => {
  if (route && typeof route !== 'string') {
    throw new Error('multihost: route is not a string');
  }
  if (!server) {
    throw new Error('multihost: server required');
  }

  const hostPatterns = hosts
    ? [].concat(hosts).map(host => new RegExp(`^${host.replace(/[*]/g, '(.*?)')}$`, 'i'))
    : [];

  return (req, res, next) => {
    if (hostPatterns.length > 0) {
      if (!req.headers.host) {
        return next();
      }

      const hostname = req.headers.host.split(':')[0];
      if (!hostPatterns.some(pattern => pattern.test(hostname))) {
        return next();
      }
    }

    if (route && req.url.indexOf(route) !== 0) {
      return next();
    }

    if (typeof server === 'function') {
      return server(req, res, next);
    }

    return server.emit('request', req, res);
  };
};

const createRouteMiddleware = (options) => {
  if (options.type === 'static') {
    return serveStatic(path.resolve(options.directory));
  }

  let server = options.server;
  if (typeof server === 'string') {
    const serverPath = path.resolve(server);
    if (require.cache[serverPath]) {
      delete require.cache[serverPath];
    }

    server = require(serverPath);
    if (server && typeof server === 'object') {
      server = server.default;
    }
  }

  if (typeof server !== 'function') {
    return null;
  }

  return createMultihost({
    hosts: options.hosts,
    route: options.route,
    server: server({ route: options.route }),
  });
};

const createApp = (routes) => {
  const app = express();

  app.enable('trust proxy');
  app.enable('case sensitive routing');
  app.disable('strict routing');
  app.disable('x-powered-by');

  routes.forEach(options => {
    try {
      const middleware = createRouteMiddleware(options);
      if (!middleware) {
        return;
      }

      if (options.type === 'static') {
        app.use(options.route, middleware);
      } else {
        app.use(middleware);
      }
    } catch (err) {
      // Preserve webappengine's behavior: an invalid route does not prevent
      // other configured routes from starting.
    }
  });

  return app;
};

const webappengine = (options = {}) => {
  const {
    backlog = 511,
    host = '0.0.0.0',
    port = 8000,
    routes = [],
  } = options;
  const eventEmitter = new EventEmitter();
  const server = http.createServer(createApp(routes));

  server.on('error', err => {
    eventEmitter.emit('error', err);
  });

  server.listen(port, host, backlog, () => {
    eventEmitter.emit('ready', server);
  });

  return eventEmitter;
};

export default webappengine;
