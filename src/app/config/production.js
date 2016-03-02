import os from 'os';

const settings = {
    backend: {
        enable: false, // disable backend service in production
        host: 'localhost',
        port: 80,
        route: 'api/'
    },
    cluster: {
        // note. node-inspector cannot debug child (forked) process
        enable: false,
        maxWorkers: os.cpus().length || 1
    },
    winston: {
        level: 'info',
        colorize: true,
        timestamp: true, // or function()
        json: false,
        handleExceptions: true
    }
};

export default settings;
