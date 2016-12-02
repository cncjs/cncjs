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
import log from './lib/log';
import { readConfigFileSync, writeConfigFileSync } from './lib/config-file';
import settings from './config/settings';

const createServer = (options, callback) => {
    const {
        port = 0,
        host,
        backlog,
        configFile,
        verbosity,
        mount,
        watchDirectory,
        allowRemoteAccess = false
    } = { ...options };
    const routes = [];
    const cncrc = path.resolve(configFile || settings.cncrc);
    const config = readConfigFileSync(cncrc);

    // cncrc
    settings.cncrc = cncrc;

    { // secret
        if (!config.secret) {
            // generate a secret key
            config.secret = bcrypt.genSaltSync(); // TODO

            // update changes
            writeConfigFileSync(cncrc, config);
        }

        settings.secret = config.secret || settings.secret;
    }

    { // routes
        if (mount) {
            routes.push({
                type: 'static',
                route: mount.url,
                directory: mount.path
            });
        }

        routes.push({
            type: 'server',
            route: '/',
            server: () => app()
        });
    }

    { // verbosity
        // https://github.com/winstonjs/winston#logging-levels
        if (verbosity === 1) {
            _.set(settings, 'verbosity', verbosity);
            log.logger.level = 'verbose';
        }
        if (verbosity === 2) {
            _.set(settings, 'verbosity', verbosity);
            log.logger.level = 'debug';
        }
        if (verbosity === 3) {
            _.set(settings, 'verbosity', verbosity);
            log.logger.level = 'silly';
        }
    }

    { // watchDirectory
        config.watchDirectory = _.get(config, 'watchDirectory', watchDirectory);

        if (config.watchDirectory) {
            if (fs.existsSync(config.watchDirectory)) {
                log.info(`Start watching ${chalk.yellow(JSON.stringify(config.watchDirectory))} for file changes.`);

                // Start monitor service
                monitor.start({ watchDirectory: config.watchDirectory });
            } else {
                log.error(`The directory ${chalk.yellow(JSON.stringify(config.watchDirectory))} does not exist.`);
            }
        }
    }

    { // allowRemoteAccess
        config.allowRemoteAccess = _.get(config, 'allowRemoteAccess', allowRemoteAccess);

        if (config.allowRemoteAccess) {
            if (_.size(config.users) === 0) {
                log.warning('You\'ve enabled remote access to the server. It\'s recommended to create an user account to protect against malicious attacks.');
            }

            _.set(settings, 'allowRemoteAccess', config.allowRemoteAccess);
        }
    }

    webappengine({ port, host, backlog, routes })
        .on('ready', (server) => {
            // Start cncengine service
            cncengine.start({ server: server });

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
            log.error(err);
        });
};

export {
    createServer
};
