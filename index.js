var path = require('path');
var webappengine = require('webappengine');
var settings = require('./dist/app/config/settings');
var cncserver = require('./dist/app/cncserver');
var options = {
    port: settings.port,
    routes: [
        {
            type: 'server',
            route: '/',
            // An absolute path is recommended to use
            server: path.resolve(__dirname, 'dist/app/app')
        }
    ]
};

webappengine(options)
    .on('ready', cncserver);
