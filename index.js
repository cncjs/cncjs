var path = require('path');
var webappengine = require('webappengine');
var cncserver = require('./dist/app/cncserver');
var options = {
    port: 8000,
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
