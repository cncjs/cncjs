import util from 'util';
import chalk from 'chalk';
import winston from 'winston';
import settings from '../config/settings';

// https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
const getStackTrace = () => {
    const obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return (obj.stack || '').split('\n');
};

const VERBOSITY_MAX = 3; // -vvv

const logger = new winston.Logger({
    exitOnError: false,
    level: settings.winston.level,
    transports: [
        new winston.transports.Console({
            colorize: true,
            timestamp: true,
            handleExceptions: true,
            json: false
        })
    ]
});

const levels = ['silly', 'debug', 'verbose', 'info', 'warn', 'error'];

module.exports = (namespace = '') => {
    namespace = String(namespace);

    return levels.reduce((acc, level) => {
        acc[level] = function(...args) {
            if ((settings.verbosity >= VERBOSITY_MAX) && (level !== 'silly')) {
                args = args.concat(getStackTrace()[2]);
            }
            return (namespace.length > 0)
                ? logger[level](chalk.cyan(namespace), util.format(...args))
                : logger[level](util.format(...args));
        };
        return acc;
    }, {});
};

module.exports.logger = logger;

levels.forEach(level => {
    module.exports[level] = function(...args) {
        if ((settings.verbosity >= VERBOSITY_MAX) && (level !== 'silly')) {
            args = args.concat(getStackTrace()[2]);
        }
        return logger[level](util.format(...args));
    };
});
