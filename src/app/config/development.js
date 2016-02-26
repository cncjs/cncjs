import os from 'os';

const settings = {
    backend: {
        enable: true,
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
        level: 'debug',
        colorize: true,
        timestamp: true, // or function()
        json: false,
        handleExceptions: true
    }
};

export default settings;
