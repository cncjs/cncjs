import os from 'os';

const settings = {
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
                handleExceptions: false
            }
        }
    }
};

export default settings;
