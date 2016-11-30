import util from 'util';
import winston from 'winston';
import settings from '../config/settings';

// https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
const getStackTrace = () => {
    const obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return (obj.stack || '').split('\n');
};

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

export default {
    logger,
    log: function(...args) {
        const level = args.shift();
        const stackTrace = getStackTrace()[2];
        logger.log(level, util.format.apply(util.format, args.concat(stackTrace)));
    },
    raw: function(...args) {
        const level = args.shift();
        logger.log(level, args.join(' '));
    },
    silly: function(...args) {
        if (logger.levels[logger.level] >= logger.levels.debug) {
            args = args.concat(getStackTrace()[2]);
        }
        logger.silly(util.format(...args));
    },
    debug: function(...args) {
        if (logger.levels[logger.level] >= logger.levels.debug) {
            args = args.concat(getStackTrace()[2]);
        }
        logger.debug(util.format(...args));
    },
    verbose: function(...args) {
        if (logger.levels[logger.level] >= logger.levels.debug) {
            args = args.concat(getStackTrace()[2]);
        }
        logger.verbose(util.format(...args));
    },
    info: function(...args) {
        if (logger.levels[logger.level] >= logger.levels.debug) {
            args = args.concat(getStackTrace()[2]);
        }
        logger.info(util.format(...args));
    },
    warn: function(...args) {
        if (logger.levels[logger.level] >= logger.levels.debug) {
            args = args.concat(getStackTrace()[2]);
        }
        logger.warn(util.format(...args));
    },
    error: function(...args) {
        if (logger.levels[logger.level] >= logger.levels.debug) {
            args = args.concat(getStackTrace()[2]);
        }
        logger.error(util.format(...args));
    }
};
