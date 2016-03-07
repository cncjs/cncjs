/* eslint no-console: 0 */

/**
 * Libraries
 */
import StackTrace from 'stacktrace-js';

/**
 * Modules
 */
import browser from './browser';

// Constants
const TRACE = 0;
const DEBUG = 1;
const INFO = 2;
const WARN = 3;
const ERROR = 4;
const NONE = 5;

const supportSafari = function() {
    const m = navigator.userAgent.match(/AppleWebKit\/(\d+)\.(\d+)(\.|\+|\s)/);
    if (!m) {
        return false;
    }
    return (parseInt(m[1], 10) + (parseInt(m[2], 10) / 100)) >= 537.38;
};

const supportOpera = function() {
    const m = navigator.userAgent.match(/OPR\/(\d+)\./);
    if (!m) {
        return false;
    }
    return parseInt(m[1], 10) >= 15;
};

const supportFirefox = function() {
    return window.console.firebug || window.console.exception;
};

const getISODateTime = function(d) {
    if (typeof d === 'undefined') {
        d = new Date();
    }

    const pad = (number, length) => {
        let str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    };

    const getTimeZoneDesignator = (d) => {
        const tzOffset = d.getTimezoneOffset();
        const hour = pad(Math.abs(tzOffset / 60), 2);
        const minute = pad(Math.abs(tzOffset % 60), 2);

        return ((tzOffset < 0) ? '+' : '-') + hour + ':' + minute;
    };

    return (d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + 'T' +
            pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2) +
            getTimeZoneDesignator(d));
};

const consoleLogger = (logger) => {
    window.console.assert(typeof logger !== 'undefined', 'logger is undefined');
    window.console.assert(typeof logger.datetime === 'string', 'datetime is not a string');
    window.console.assert(typeof logger.level === 'string', 'level is not a string');

    const console = window.console;

    if (!console) {
        return;
    }

    let args = [];
    if (browser.isIE() ||
       (browser.isFirefox() && ! supportFirefox()) ||
       (browser.isOpera() && ! supportOpera()) ||
       (browser.isSafari() && ! supportSafari())) {
        args.push(logger.datetime || '');
        args.push(logger.level || '');
    } else {
        const styles = {
            datetime: 'font-weight: bold; line-height: 20px; padding: 2px 4px; color: #3B5998; background: #EDEFF4',
            level: {
                'T': 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #4F8A10; background: #DFF2BF',
                'D': 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #222; background: #F5F5F5',
                'I': 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #00529B; background: #BDE5F8',
                'W': 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #9F6000; background: #EFEFB3',
                'E': 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #D8000C; background: #FFBABA'
            }
        };
        args.push('%c' + logger.datetime + '%c %c' + logger.level + '%c');
        args.push(styles.datetime);
        args.push('');
        args.push(styles.level[logger.level] || '');
        args.push('');
    }

    if (logger.prefix) {
        args.push(logger.prefix);
    }
    if (logger.args) {
        args = args.concat(logger.args);
    }
    if (logger.stackframes) {
        args.push(logger.stackframes[4].source);
    }

    try {
        // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
        //
        // console.log.apply not working in Internet Explorer 9 and earlier browser versions
        // Use console.log(message) for IE and console.log.apply(console, arguments) for Safari, Firefox, Chrome, etc.
        if ((browser.isIE() && (browser.getIEVersion() <= 9)) ||
            (browser.isFirefox() && ! supportFirefox())) {
            const message = args.join(' ');
            console.log(message);
            return;
        }

        if (typeof console !== 'undefined' && typeof console.log !== 'undefined' && console.log.apply) {
            console.log.apply(console, args);
        }
    } catch (e) {
        console.error(e);
    }
};

class Log {
    _prefix = false;
    _level = DEBUG;
    _logger = consoleLogger;

    _log(level, args) {
        StackTrace.get({
            // offline: Boolean (default: false) - Set to true to prevent all network requests
            offline: true
        }).then((stackframes) => {
            const d = new Date();
            this._logger({
                datetime: getISODateTime(d),
                level: level,
                prefix: this.getPrefix(),
                args: args,
                stackframes: stackframes
            });
        });
    }
    setPrefix(prefix) {
        if (typeof prefix !== 'undefined') {
            this._prefix = prefix;
        } else {
            this._prefix = false;
        }

        return this._prefix;
    }
    getPrefix() {
        return (this._prefix !== false) ? this._prefix : '';
    }
    setLogger(logger) {
        if (typeof logger === 'function') {
            this._logger = logger;
            return this._logger;
        } else if (typeof logger === 'string') {
            this._logger = {
                'console': consoleLogger
            }[logger] || this._logger;

            if (typeof this._logger === 'undefined') {
                this._logger = function nullLogger(logger) { }; // default
            }
        }

        return this._logger;
    }
    getLogger() {
        return this._logger;
    }
    setLevel(level) {
        if (typeof level === 'number') {
            this._level = level;
        } else if (typeof level === 'string') {
            this._level = {
                'trace': TRACE,
                'debug': DEBUG,
                'info': INFO,
                'warn': WARN,
                'error': ERROR
            }[level] || this._level;

            if (typeof this._level === 'undefined') {
                this._level = NONE; // default
            }
        }

        return this._level;
    }
    getLevel() {
        return this._level;
    }
    log(...args) {
        this._log('', args);
    }
    trace(...args) {
        const level = this._level;
        if (level <= TRACE) {
            this._log('T', args);
        }
    }
    debug(...args) {
        if (this._level <= DEBUG) {
            this._log('D', args);
        }
    }
    info(...args) {
        if (this._level <= INFO) {
            this._log('I', args);
        }
    }
    warn(...args) {
        if (this._level <= WARN) {
            this._log('W', args);
        }
    }
    error(...args) {
        if (this._level <= ERROR) {
            this._log('E', args);
        }
    }
}

const log = new Log();

module.exports = {
    setLevel: (...args) => {
        log.setLevel.apply(log, args);
    },
    getLevel: (...args) => {
        return log.getLevel.apply(log, args);
    },
    setLogger: (...args) => {
        log.setLogger.apply(log, args);
    },
    getLogger: (...args) => {
        return log.getLogger.apply(log, args);
    },
    setPrefix: (...args) => {
        log.setPrefix.apply(log, args);
    },
    getPrefix: (...args) => {
        return log.getPrefix.apply(log, args);
    },
    log: (...args) => {
        return log.log.apply(log, args);
    },
    trace: (...args) => {
        return log.trace.apply(log, args);
    },
    debug: (...args) => {
        return log.debug.apply(log, args);
    },
    info: (...args) => {
        return log.info.apply(log, args);
    },
    warn: (...args) => {
        return log.warn.apply(log, args);
    },
    error: (...args) => {
        return log.error.apply(log, args);
    }
};
