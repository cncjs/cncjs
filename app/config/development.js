var os = require('os');

var settings = {
    backend: {
        enable: true,
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
    //sessionSecret: 'SessionSecretForDevelopment',
    winston: {
        prefix: '',
        transports: {
            Console: {
                level: 'debug',
                silent: false,
                colorize: true,
                timestamp: true, // or function()
                json: false,
                handleExceptions: true
            },
            File: {
                level: 'debug',
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
