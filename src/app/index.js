/* eslint no-unused-vars: 0 */
import _ from 'lodash';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import webappengine from 'webappengine';
import app from './app';
import cncserver from './cncserver';
import log from './lib/log';
import settings from './config/settings';

const createServer = ({ port = 0, host, backlog, config, verbose, mount }, callback) => {
    const routes = [];

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

    { // settings
        if (verbose === 1) {
            _.set(settings, 'verbosity', 1);
            _.set(settings, 'winston.level', 'debug');
        }
        if (verbose === 2) {
            _.set(settings, 'verbosity', 2);
            _.set(settings, 'winston.level', 'trace');
        }

        const cncrc = path.resolve(config || settings.cncrc);
        try {
            const cnc = JSON.parse(fs.readFileSync(cncrc, 'utf8'));

            if (!(_.isObject(cnc))) {
                console.error(chalk.bold.red('Check your configuration file to ensure it contain valid settings.'));
                console.error(cnc);
                process.exit(1);
            }

            _.set(settings, 'cncrc', cncrc);
            _.set(settings, 'cnc', _.merge({}, settings.cnc, cnc));
        } catch (err) {
            // skip error
        }
    }

    webappengine({ port, host, backlog, routes })
        .on('ready', (server) => {
            cncserver(server);
            callback && callback(server);
        });
};

export {
    createServer
};
