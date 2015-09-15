var os = require('os');

var settings = {
    backend: {
        enable: false, // disable backend service in production
        host: 'localhost',
        port: 80,
        route: 'api/'
    },
    livereload: {
        enable: false
    },
    cluster: {
        // note. node-inspector cannot debug child (forked) process
        enable: false,
        maxWorkers: os.cpus().length || 1
    },
    //sessionSecret: 'SessionSecretForProduction',
    winston: {
        prefix: '',
        transports: {
            Console: {
                level: 'info',
                silent: false,
                colorize: true,
                timestamp: true, // or function()
                json: false,
                handleExceptions: true
            },
            File: {
                level: 'info',
                silent: false,
                colorize: false,
                timestamp: true, // or function()
                filename: 'log/app%s.log',
                maxsize: 104857600,
                maxFiles: 10,
                json: true,
                handleExceptions: true
            }
        },
        exceptionHandlers: {
            File: {
                timestamp: true, // or function()
                filename: 'log/error%s.log',
                maxsize: 104857600,
                maxFiles: 10,
                json: true
            }
        }
    }
};

module.exports = settings;
