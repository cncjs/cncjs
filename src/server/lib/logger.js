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

const { combine, colorize, timestamp, printf } = winston.format;

// https://github.com/winstonjs/winston/blob/master/README.md#creating-your-own-logger
const logger = winston.createLogger({
    exitOnError: false,
    level: settings.winston.level,
    silent: false,
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp(),
                printf(log => `${log.timestamp} - ${log.level} ${log.message}`)
            ),
            handleExceptions: true
        })
    ]
});

// https://github.com/winstonjs/winston/blob/master/README.md#logging-levels
// npm logging levels are prioritized from 0 to 5 (highest to lowest):
const levels = [
    'error', // 0
    'warn', // 1
    'info', // 2
    'verbose', // 3
    'debug', // 4
    'silly', // 5
];

module.exports = (namespace = '') => {
    namespace = String(namespace);

    return levels.reduce((acc, level) => {
        acc[level] = function(...args) {
            if ((settings.verbosity >= VERBOSITY_MAX) && (level !== 'silly')) {
                args = args.concat(getStackTrace()[2]);
            }
            return (namespace.length > 0)
                ? logger[level](chalk.cyan(namespace) + ' ' + util.format(...args))
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
