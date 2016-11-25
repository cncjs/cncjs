/* eslint no-unused-vars: 0 */
import _ from 'lodash';
import bcrypt from 'bcrypt-nodejs';
import fs from 'fs';
import path from 'path';
import webappengine from 'webappengine';
import app from './app';
import cncserver from './cncserver';
import log from './lib/log';
import { readConfigFileSync, writeConfigFileSync } from './lib/config-file';
import settings from './config/settings';

const createServer = (options, callback) => {
    const {
        port = 0,
        host,
        backlog,
        config,
        verbosity,
        allowRemoteAccess = false,
        mount
    } = { ...options };
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

        _.set(settings, 'allowRemoteAccess', !!allowRemoteAccess);

        const cncrc = path.resolve(config || settings.cncrc);
        const cnc = readConfigFileSync(cncrc);
        if (!cnc.secret) {
            // generate a secret key
            cnc.secret = bcrypt.genSaltSync(); // TODO

            // update changes
            writeConfigFileSync(cncrc, cnc);
        }

        settings.cncrc = cncrc;
        settings.secret = cnc.secret || settings.secret;
    }

    webappengine({ port, host, backlog, routes })
        .on('ready', (server) => {
            cncserver(server);
            callback && callback(null, server);
        })
        .on('error', (err) => {
            callback && callback(err);
        });
};

export {
    createServer
};
