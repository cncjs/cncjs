import dns from 'dns';
import fs from 'fs';
import http from 'http';
import https from 'https';
import os from 'os';
import path from 'path';
import url from 'url';
import bcrypt from 'bcrypt-nodejs';
import chalk from 'chalk';
import { ensureArray, ensureString } from 'ensure-type';
import expandTilde from 'expand-tilde';
import express from 'express';
import httpProxy from 'http-proxy';
import escapeRegExp from 'lodash/escapeRegExp';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import size from 'lodash/size';
import trimEnd from 'lodash/trimEnd';
import uniqWith from 'lodash/uniqWith';
import settings from './config/settings';
import app from './app';
import cncengine from './services/cncengine';
import monitor from './services/monitor';
import config from './services/configstore';
import createWebApp from './lib/create-web-app';
import logger, { setLevel } from './lib/logger';
import urljoin from './lib/urljoin';

const log = logger('init');

const createServer = (options, callback) => {
  options = { ...options };

  { // verbosity
    const verbosity = options.verbosity;

    // https://github.com/winstonjs/winston#logging-levels
    if (verbosity === 1) {
      set(settings, 'verbosity', verbosity);
      setLevel('verbose');
    }
    if (verbosity === 2) {
      set(settings, 'verbosity', verbosity);
      setLevel('debug');
    }
    if (verbosity === 3) {
      set(settings, 'verbosity', verbosity);
      setLevel('silly');
    }
  }

  const rcfile = path.resolve(options.configFile || settings.rcfile);

  // configstore service
  log.info(`Loading configuration from ${chalk.yellow(JSON.stringify(rcfile))}`);
  config.load(rcfile);

  // rcfile
  settings.rcfile = rcfile;

  { // secret
    if (!config.get('secret')) {
      // generate a secret key
      const secret = bcrypt.genSaltSync(); // TODO: use a strong secret
      config.set('secret', secret);
    }

    settings.secret = config.get('secret', settings.secret);
  }

  { // watchDirectory
    const watchDirectory = options.watchDirectory || config.get('watchDirectory');

    if (watchDirectory) {
      if (fs.existsSync(watchDirectory)) {
        log.info(`Watching ${chalk.yellow(JSON.stringify(watchDirectory))} for file changes`);

        // monitor service
        monitor.start({ watchDirectory: watchDirectory });
      } else {
        log.error(`The directory ${chalk.yellow(JSON.stringify(watchDirectory))} does not exist.`);
      }
    }
  }

  { // accessTokenLifetime
    const accessTokenLifetime = options.accessTokenLifetime || config.get('accessTokenLifetime');

    if (accessTokenLifetime) {
      set(settings, 'accessTokenLifetime', accessTokenLifetime);
    }
  }

  { // allowRemoteAccess
    const allowRemoteAccess = options.allowRemoteAccess || config.get('allowRemoteAccess', false);

    if (allowRemoteAccess) {
      if (size(config.get('users')) === 0) {
        log.warn('You\'ve enabled remote access to the server. It\'s recommended to create an user account to protect against malicious attacks.');
      }

      set(settings, 'allowRemoteAccess', allowRemoteAccess);
    }
  }

  const { port = 0, host = '0.0.0.0', backlog = 511 } = options;
  const mountPoints = uniqWith([
    ...ensureArray(options.mountPoints),
    ...ensureArray(config.get('mountPoints'))
  ], isEqual).filter(mount => {
    if (!mount || !mount.route || mount.route === '/') {
      log.error(`Must specify a valid route path ${JSON.stringify(mount.route)}.`);
      return false;
    }

    return true;
  });
  const routes = [];

  mountPoints.forEach(mount => {
    if (ensureString(mount.target).match(/^(http|https):\/\//i)) {
      log.info(`Starting a proxy server to proxy all requests starting with ${chalk.yellow(mount.route)} to ${chalk.yellow(mount.target)}`);

      routes.push({
        type: 'server',
        route: mount.route,
        server: (options) => {
          // route
          // > '/custom-widget/'
          // routeWithoutTrailingSlash
          // > '/custom-widget'
          // target
          // > 'https://cncjs.github.io/cncjs-widget-boilerplate/'
          // targetPathname
          // > '/cncjs-widget-boilerplate/'
          // proxyPathPattern
          // > RegExp('^/cncjs-widget-boilerplate/custom-widget')
          const { route = '/' } = { ...options };
          const routeWithoutTrailingSlash = trimEnd(route, '/');
          const target = mount.target;
          const targetPathname = url.parse(target).pathname;
          const proxyPathPattern = new RegExp('^' + escapeRegExp(urljoin(targetPathname, routeWithoutTrailingSlash)), 'i');

          log.debug(`> route=${chalk.yellow(route)}`);
          log.debug(`> routeWithoutTrailingSlash=${chalk.yellow(routeWithoutTrailingSlash)}`);
          log.debug(`> target=${chalk.yellow(target)}`);
          log.debug(`> targetPathname=${chalk.yellow(targetPathname)}`);
          log.debug(`> proxyPathPattern=RegExp(${chalk.yellow(proxyPathPattern)})`);

          const proxy = httpProxy.createProxyServer({
            // Change the origin of the host header to the target URL
            changeOrigin: true,

            // Do not verify the SSL certificate for self-signed certs
            //secure: false,

            target: target
          });

          proxy.on('proxyReq', (proxyReq, req, res, options) => {
            const originalPath = proxyReq.path || '';
            proxyReq.path = originalPath
              .replace(proxyPathPattern, targetPathname)
              .replace('//', '/');

            log.debug(`proxy.on('proxyReq'): modifiedPath=${chalk.yellow(proxyReq.path)}, originalPath=${chalk.yellow(originalPath)}`);
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            log.debug(`proxy.on('proxyRes'): headers=${JSON.stringify(proxyRes.headers, true, 2)}`);
          });

          const app = express();

          // Matched routes:
          //   /widget/
          //   /widget/v1/
          app.all(urljoin(routeWithoutTrailingSlash, '*'), (req, res) => {
            const url = req.url;
            log.debug(`proxy.web(): url=${chalk.yellow(url)}`);
            proxy.web(req, res);
          });

          // Matched routes:
          //   /widget
          app.all(routeWithoutTrailingSlash, (req, res, next) => {
            const url = req.url;
            // Redirect URL with a trailing slash
            if (url.indexOf(routeWithoutTrailingSlash) === 0 &&
                            url.indexOf(routeWithoutTrailingSlash + '/') < 0) {
              const redirectUrl = routeWithoutTrailingSlash + '/' + url.slice(routeWithoutTrailingSlash.length);
              log.debug(`redirect: url=${chalk.yellow(url)}, redirectUrl=${chalk.yellow(redirectUrl)}`);
              res.redirect(301, redirectUrl);
              return;
            }

            next();
          });

          return app;
        }
      });
    } else {
      // expandTilde('~') => '/Users/<userhome>'
      const directory = expandTilde(ensureString(mount.target)).trim();

      log.info(`Mounting a directory ${chalk.yellow(JSON.stringify(directory))} to serve requests starting with ${chalk.yellow(mount.route)}`);

      if (!directory) {
        log.error(`The directory path ${chalk.yellow(JSON.stringify(directory))} must not be empty.`);
        return;
      }
      if (!path.isAbsolute(directory)) {
        log.error(`The directory path ${chalk.yellow(JSON.stringify(directory))} must be absolute.`);
        return;
      }
      if (!fs.existsSync(directory)) {
        log.error(`The directory path ${chalk.yellow(JSON.stringify(directory))} does not exist.`);
        return;
      }

      routes.push({
        type: 'static',
        route: mount.route,
        directory: directory
      });
    }
  });

  routes.push({
    type: 'server',
    route: '/',
    server: () => app()
  });

  /*
   * HTTPS when a key and a certificate are given, and plain HTTP otherwise.
   *
   * Not a nicety. A phone will not install a web application, and will not
   * register a service worker for it, unless the origin is *secure* — and
   * `http://cnc.lan:8000` is not. Measured 2026-09-23 by asking Chrome
   * itself: from localhost the only thing it had against installing the
   * panel was that the test ran in incognito; from the LAN address it
   * answered `not-from-secure-origin`, flatly.
   *
   * So the pendant's whole reason for having a manifest depends on this, and
   * until now the server could only speak HTTP — `http.createServer`, no
   * option, no config key.
   *
   * Both or neither. A key without a certificate is a server that would start
   * and then fail every handshake, which is a worse way to find out than
   * being told at boot.
   */
  if (Boolean(options.tlsKey) !== Boolean(options.tlsCert)) {
    const err = new Error('--tls-key and --tls-cert have to be given together');
    callback && callback(err);
    log.error(err.message);
    return;
  }

  /*
   * Where the authority certificate lives, so the panel can offer it for
   * download.
   *
   * It was a file copy before: serve-panel.sh dropped `cnc-ca.crt` into the
   * panel's build output next to the bundle. That output directory is emptied
   * by webpack on every rebuild, so in a watched session the download button
   * would quietly start returning the panel's own index.html the next time
   * anything was edited.
   *
   * Only the certificate. The key beside it is what the whole arrangement
   * rests on and has no route, here or anywhere.
   */
  if (options.tlsCa) {
    set(settings, 'tlsCa', expandTilde(options.tlsCa));
  }

  const tls = options.tlsKey
    ? {
      key: fs.readFileSync(expandTilde(options.tlsKey)),
      cert: fs.readFileSync(expandTilde(options.tlsCert)),
    }
    : null;

  const server = tls
    ? https.createServer(tls, createWebApp(routes))
    : http.createServer(createWebApp(routes));

  // The socket.io server and every controller add listeners of their own.
  server.setMaxListeners(0);

  server.on('error', (err) => {
    callback && callback(err);
    log.error(err);
  });

  server.listen(port, host, backlog, () => {
    // cncengine service
    cncengine.start(server, options.controller || config.get('controller', ''));

    const address = server.address().address;
    const port = server.address().port;

    callback && callback(null, {
      address,
      port,
      mountPoints,
    });

    if (address !== '0.0.0.0') {
      log.info('Starting the server at ' + chalk.yellow(`http://${address}:${port}`));
      return;
    }

    dns.lookup(os.hostname(), { family: 4, all: true }, (err, addresses) => {
      if (err) {
        log.error('Can\'t resolve host name:', err);
        return;
      }

      addresses.forEach(({ address, family }) => {
        log.info('Starting the server at ' + chalk.yellow(`http://${address}:${port}`));
      });
    });
  });
};

export {
  createServer
};
