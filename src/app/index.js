import _ from 'lodash';
import app from './app';
import cncserver from './cncserver';
import settings from './config/settings';
import webappengine from 'webappengine';

const defaultRoute = {
    type: 'server',
    route: '/',
    server: function(options) {
        return app();
    }
};

module.exports = (options) => {
    let { port, host, backlog, routes } = options;

    // Add default route
    routes.push(defaultRoute);

    // Merge settings
    _.merge(settings, options.settings);

    webappengine({ port, host, backlog, routes })
        .on('ready', (server) => {
            cncserver(server);
        });
};
