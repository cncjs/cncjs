import _ from 'lodash';
import cluster from 'cluster';
import util from 'util';
import winston from 'winston';
import settings from '../config/settings';

// String utils
import 'colors';
import 'string-format';

// Default settings
const defaults = {
    levels: {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4
    },
    colors: {
        trace: 'magenta',
        debug: 'blue',
        info: 'green',
        warn: 'yellow',
        error: 'red'
    },
    exitOnError: (err) => {
        console.error('Error:', err);
        return false;
    }
};

const meta = () => {
    let _meta = {};
    if (cluster.isMaster) {
        _meta.id = 0;
        _meta.pid = process.pid;
    } else if (cluster.isWorker) {
        _meta.id = cluster.worker.id;
        _meta.pid = cluster.worker.process.pid;
    }
    return { meta: _meta };
};

// https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
const getStackTrace = () => {
    let obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return (obj.stack || '').split('\n');
};

const logger = new winston.Logger(_.defaults({}, settings.winston, defaults));
const prefix = [];

export default {
    log: function(...args) {
        let level = args.shift();
        let stackTrace = getStackTrace()[2];
        logger.log(level, util.format.apply(util.format, prefix.concat(args).concat(stackTrace)), meta());
    },
    trace: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.trace(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)), meta());
    },
    debug: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.debug(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)), meta());
    },
    info: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.info(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)), meta());
    },
    warn: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.warn(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)), meta());
    },
    error: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.error(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)), meta());
    }
};
