/* eslint no-unused-vars: 0 */
import dns from 'dns';
import fs from 'fs';
import os from 'os';
import path from 'path';
import _ from 'lodash';
import bcrypt from 'bcrypt-nodejs';
import chalk from 'chalk';
import webappengine from 'webappengine';
import app from './app';
import cncengine from './services/cncengine';
import monitor from './services/monitor';
import config from './services/configstore';
import logger from './lib/logger';
import settings from './config/settings';

const log = logger();

const createServer = (options, callback) => {
    options = { ...options };

    { // verbosity
        const verbosity = options.verbosity;

        // https://github.com/winstonjs/winston#logging-levels
        if (verbosity === 1) {
            _.set(settings, 'verbosity', verbosity);
            logger.logger.level = 'verbose';
        }
        if (verbosity === 2) {
            _.set(settings, 'verbosity', verbosity);
            logger.logger.level = 'debug';
        }
        if (verbosity === 3) {
            _.set(settings, 'verbosity', verbosity);
            logger.logger.level = 'silly';
        }
    }

    const cncrc = path.resolve(options.configFile || settings.cncrc);

    // Setup configstore service
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
                log.info(`Start watching ${chalk.yellow(JSON.stringify(watchDirectory))} for file changes.`);

                // Start monitor service
                monitor.start({ watchDirectory: watchDirectory });
            } else {
                log.error(`The directory ${chalk.yellow(JSON.stringify(watchDirectory))} does not exist.`);
            }
        }
    }

    { // accessTokenLifetime
        const accessTokenLifetime = options.accessTokenLifetime || config.get('accessTokenLifetime');

        if (accessTokenLifetime) {
            _.set(settings, 'accessTokenLifetime', accessTokenLifetime);
        }
    }

    { // allowRemoteAccess
        const allowRemoteAccess = options.allowRemoteAccess || config.get('allowRemoteAccess', false);

        if (allowRemoteAccess) {
            if (_.size(config.get('users')) === 0) {
                log.warn('You\'ve enabled remote access to the server. It\'s recommended to create an user account to protect against malicious attacks.');
            }

            _.set(settings, 'allowRemoteAccess', allowRemoteAccess);
        }
    }

    const { port = 0, host, backlog } = options;
    const routes = [];

    if (typeof options.mount === 'object') {
        routes.push({
            type: 'static',
            route: options.mount.url,
            directory: options.mount.path
        });
    }
    routes.push({
        type: 'server',
        route: '/',
        server: () => app()
    });

    webappengine({ port, host, backlog, routes })
        .on('ready', (server) => {
            // Start cncengine service
            cncengine.start({ server: server });
            callback && callback(null, server);

            const address = server.address().address;
            const port = server.address().port;
            if (address !== '0.0.0.0') {
                log.info('Started the server at ' + chalk.cyan(`http://${address}:${port}`));
                return;
            }

            dns.lookup(os.hostname(), { family: 4, all: true }, (err, addresses) => {
                if (err) {
                    log.error('Can\'t resolve host name:', err);
                    return;
                }

                addresses.forEach(({ address, family }) => {
                    log.info('Started the server at ' + chalk.cyan(`http://${address}:${port}`));
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
