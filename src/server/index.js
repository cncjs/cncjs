import dns from 'dns';
import fs from 'fs';
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
import webappengine from 'webappengine';
import settings from './config/settings';
import app from './app';
import cncengine from './services/cncengine';
import monitor from './services/monitor';
import config from './services/configstore';
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

  const { port = 0, host, backlog } = options;
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

  webappengine({ port, host, backlog, routes })
    .on('ready', (server) => {
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
    })
    .on('error', (err) => {
      callback && callback(err);
      log.error(err);
    });
};

export {
  createServer
};
