var path = require('path');
var webappengine = require('webappengine');
var server = require('./server');
var options = {
    port: 8000,
    routes: [
        {
            type: 'server',
            route: '/',
            // An absolute path is recommended to use
            server: path.resolve(__dirname, 'app/app')
        }
    ]
};

webappengine(options)
    .on('ready', server);
