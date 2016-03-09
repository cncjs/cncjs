import _ from 'lodash';
import path from 'path';
import app from './app';
import cncserver from './cncserver';
import settings from './config/settings';
import webappengine from 'webappengine';
import colors from 'colors';

const run = ({ port, host, backlog, config, verbose, mount }) => {
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
                console.error('Check your configuration file to ensure it contain valid settings.'.bold.red);
                console.error(cnc);
                process.exit(1);
            }

            _.set(settings, 'cncrc', crcrc);
            _.set(settings, 'cnc', _.merge({}, settings.cnc, cnc));
        } catch(err) {
            // skip error
        }
    }

    webappengine({ port, host, backlog, routes })
        .on('ready', (server) => {
            cncserver(server);
        });
};

export {
    run
};
