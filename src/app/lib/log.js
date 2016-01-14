import _ from 'lodash';
import cluster from 'cluster';
import fs from 'fs';
import path from 'path';
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
        console.log('Error:', err);
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

// Store the logger instance
const getLoggerInstance = (settings) => {
    let logDirs = [];

    if (_.get(settings, 'transports.File.filename')) {
        logDirs.push(path.dirname(settings.transports.File.filename));
    }
    if (_.get(settings, 'exceptionHandlers.File.filename')) {
        logDirs.push(path.dirname(settings.exceptionHandlers.File.filename));
    }

    _.each(logDirs, (logDir) => {
        if (!logDir) {
            return;
        }
        if (!(fs.existsSync(logDir))) {
            // Create the directory if it does not exist
            fs.mkdirSync(logDir);
        }
    });

    if (cluster.isMaster) {
        if (_.get(settings, 'transports.File.filename')) {
            settings.transports.File.filename = util.format(settings.transports.File.filename, '');
        }
        if (_.get(settings, 'exceptionHandlers.File.filename')) {
            settings.exceptionHandlers.File.filename = util.format(settings.exceptionHandlers.File.filename, '');
        }
    } else if (cluster.isWorker) {
        if (_.get(settings, 'transports.File.filename')) {
            settings.transports.File.filename = util.format(settings.transports.File.filename, ':' + cluster.worker.id);
        }
        if (_.get(settings, 'exceptionHandlers.File.filename')) {
            settings.exceptionHandlers.File.filename = util.format(settings.exceptionHandlers.File.filename, ':' + cluster.worker.id);
        }
    }

    let logger = new (winston.Logger)(defaults);

    if (!(settings.transports)) {
        return;
    }

    if (settings.transports.Console) {
        logger.add(winston.transports.Console, settings.transports.Console);
    }

    if (settings.transports.File) {
        logger.add(winston.transports.File, settings.transports.File);
    }

    if (settings.exceptionHandlers && settings.exceptionHandlers.File) {
        logger.handleExceptions(
            new winston.transports.File(settings.exceptionHandlers.File)
        );
    }

    logger.settings = settings;

    return logger;
};

let logger = getLoggerInstance(settings.winston);

let arr = [];
if (logger.settings.prefix) { // prefix
    arr.push(logger.settings.prefix);
}

export default {
    log: function() {
        let args = Array.prototype.slice.call(arguments);
        let level = args.shift();
        let stackTrace = getStackTrace()[2];
        logger.log(level, util.format.apply(util.format, arr.concat(args).concat(stackTrace)), meta());
    },
    trace: function() {
        let args = Array.prototype.slice.call(arguments);
        let stackTrace = getStackTrace()[2];
        logger.trace(util.format.apply(util.format, arr.concat(args).concat(stackTrace)), meta());
    },
    debug: function() {
        let args = Array.prototype.slice.call(arguments);
        let stackTrace = getStackTrace()[2];
        logger.debug(util.format.apply(util.format, arr.concat(args).concat(stackTrace)), meta());
    },
    info: function() {
        let args = Array.prototype.slice.call(arguments);
        let stackTrace = getStackTrace()[2];
        logger.info(util.format.apply(util.format, arr.concat(args).concat(stackTrace)), meta());
    },
    warn: function() {
        let args = Array.prototype.slice.call(arguments);
        let stackTrace = getStackTrace()[2];
        logger.warn(util.format.apply(util.format, arr.concat(args).concat(stackTrace)), meta());
    },
    error: function() {
        let args = Array.prototype.slice.call(arguments);
        let stackTrace = getStackTrace()[2];
        logger.error(util.format.apply(util.format, arr.concat(args).concat(stackTrace)), meta());
    }
};
