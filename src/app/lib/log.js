import util from 'util';
import winston from 'winston';
import settings from '../config/settings';

// https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
const getStackTrace = () => {
    let obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return (obj.stack || '').split('\n');
};

const prefix = [];
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
        let level = args.shift();
        let stackTrace = getStackTrace()[2];
        logger.log(level, util.format.apply(util.format, prefix.concat(args).concat(stackTrace)));
    },
    debug: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.debug(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)));
    },
    verbose: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.verbose(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)));
    },
    info: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.info(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)));
    },
    warn: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.warn(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)));
    },
    error: function(...args) {
        let stackTrace = getStackTrace()[2];
        logger.error(util.format.apply(util.format, prefix.concat(args).concat(stackTrace)));
    }
};
