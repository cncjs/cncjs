/* eslint no-unused-vars: 0 */
import dns from 'dns';
import fs from 'fs';
import os from 'os';
import path from 'path';
import set from 'lodash/set';
import size from 'lodash/size';
import bcrypt from 'bcrypt-nodejs';
import chalk from 'chalk';
import webappengine from 'webappengine';
import app from './app';
import cncengine from './services/cncengine';
import monitor from './services/monitor';
import config from './services/configstore';
import ensureArray from './lib/ensure-array';
import logger from './lib/logger';
import settings from './config/settings';

const log = logger('init');

const createServer = (options, callback) => {
    options = { ...options };

    { // verbosity
        const verbosity = options.verbosity;

        // https://github.com/winstonjs/winston#logging-levels
        if (verbosity === 1) {
            set(settings, 'verbosity', verbosity);
            logger.logger.level = 'verbose';
        }
        if (verbosity === 2) {
            set(settings, 'verbosity', verbosity);
            logger.logger.level = 'debug';
        }
        if (verbosity === 3) {
            set(settings, 'verbosity', verbosity);
            logger.logger.level = 'silly';
        }
    }

    const cncrc = path.resolve(options.configFile || settings.cncrc);

    // configstore service
    log.info(`Loading configuration from ${chalk.yellow(JSON.stringify(cncrc))}`);
    config.load(cncrc);

    // cncrc
    settings.cncrc = cncrc;

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
    const routes = [];

    ensureArray(options.mountPoints).forEach(mount => {
        const { route = '', directory = '' } = mount;
        const cjs = {
            route: chalk.yellow(JSON.stringify(route)),
            directory: chalk.yellow(JSON.stringify(directory))
        };

        log.info(`Mounting a directory ${cjs.directory} for the route ${cjs.route}`);

        if (!route) {
            log.error(`Must specify a valid route path ${cjs.route}.`);
            return;
        }
        if (!directory) {
            log.error(`The directory path ${cjs.directory} must not be empty.`);
            return;
        }
        if (!path.isAbsolute(directory)) {
            log.error(`The directory path ${cjs.directory} must be absolute.`);
            return;
        }
        if (!fs.existsSync(directory)) {
            log.error(`The directory path ${cjs.directory} does not exist.`);
            return;
        }

        routes.push({
            type: 'static',
            route: route,
            directory: directory
        });
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
            const filteredRoutes = routes.reduce((acc, r) => {
                const { type, route, directory } = r;
                if (type === 'static') {
                    acc.push({
                        path: route,
                        directory: directory
                    });
                }
                return acc;
            }, []);

            callback && callback(null, {
                address: address,
                port: port,
                routes: filteredRoutes
            });

            if (address !== '0.0.0.0') {
                log.info('Starting the server at ' + chalk.cyan(`http://${address}:${port}`));
                return;
            }

            dns.lookup(os.hostname(), { family: 4, all: true }, (err, addresses) => {
                if (err) {
                    log.error('Can\'t resolve host name:', err);
                    return;
                }

                addresses.forEach(({ address, family }) => {
                    log.info('Starting the server at ' + chalk.cyan(`http://${address}:${port}`));
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
