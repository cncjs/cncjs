import path from 'path';
import express from 'express';
import serveStatic from 'serve-static';

/**
 * Build the Express app that hosts the route table assembled in `index.js`.
 *
 * A `static` entry serves a directory under its own route. A `server` entry
 * contributes an Express app of its own, and is mounted at the root rather
 * than on its route: the proxy apps built in `index.js` spell the mount prefix
 * out in their own route patterns, so letting Express strip it would stop them
 * matching anything.
 */
const createWebApp = (routes = []) => {
  const app = express();

  app.enable('trust proxy'); // Enables reverse proxy support, disabled by default
  app.enable('case sensitive routing'); // Enable case sensitivity, disabled by default, treating "/Foo" and "/foo" as the same
  app.disable('strict routing'); // Enable strict routing, by default "/foo" and "/foo/" are treated the same by the router
  app.disable('x-powered-by'); // Enables the X-Powered-By: Express HTTP header, enabled by default

  routes.forEach(route => {
    if (route.type === 'static') {
      app.use(route.route, serveStatic(path.resolve(route.directory)));
      return;
    }

    app.use(route.server({ route: route.route }));
  });

  return app;
};

export default createWebApp;
