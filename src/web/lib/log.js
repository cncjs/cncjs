/**
 * Libraries
 */
var printStackTrace = require('stacktrace');

/**
 * Modules
 */
var browser = require('./browser');

// Constants
var TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    NONE = 5,
    SEPARATOR = '\t';

var supportSafari = function() {
    var m = navigator.userAgent.match(/AppleWebKit\/(\d+)\.(\d+)(\.|\+|\s)/);
    if ( ! m) {
        return false;
    }
    return 537.38 <= parseInt(m[1], 10) + (parseInt(m[2], 10) / 100);
};

var supportOpera = function() {
    var m = navigator.userAgent.match(/OPR\/(\d+)\./);
    if ( ! m) {
        return false;
    }
    return 15 <= parseInt(m[1], 10);
};

var supportFirefox = function() {
    return window.console.firebug || window.console.exception;
};

var getISODateTime = function(d) {
    if (typeof d === 'undefined') {
        d = new Date();
    }

    function pad(number, length) {
        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    }

    function getTimeZoneDesignator(d) {
        var tz_offset = d.getTimezoneOffset();
        var hour = pad(Math.abs(tz_offset / 60), 2);
        var minute = pad(Math.abs(tz_offset % 60), 2);
        tz_offset = ((tz_offset < 0) ? '+' : '-') + hour + ':' + minute;
        return tz_offset;
    }

    return (d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + 'T' +
            pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2) +
            getTimeZoneDesignator(d));
};

var consoleLogger = function(logger) {
    window.console.assert(typeof logger !== 'undefined', 'logger is undefined');
    window.console.assert(typeof logger.datetime === 'string', 'datetime is not a string');
    window.console.assert(typeof logger.level === 'string', 'level is not a string');

    var console = window.console;

    if ( ! console) {
        return;
    }

    var args = [];
    if (browser.isIE() ||
       (browser.isFirefox() && ! supportFirefox()) ||
       (browser.isOpera() && ! supportOpera()) ||
       (browser.isSafari() && ! supportSafari())) {
        args.push(logger.datetime || '');
        args.push(logger.level || '');
    } else {
        var styles = {
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
    if (logger.stackTrace) {
        args.push(logger.stackTrace[6]);
    }

    try {
        // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
        //
        // console.log.apply not working in Internet Explorer 9 and earlier browser versions
        // Use console.log(message) for IE and console.log.apply(console, arguments) for Safari, Firefox, Chrome, etc.
        if ((browser.isIE() && (browser.getIEVersion() <= 9)) ||
            (browser.isFirefox() && ! supportFirefox())) {
            var message = args.join(' ');
            console.log(message);
            return;
        }

        if (typeof console !== 'undefined' && typeof console.log !== 'undefined' && console.log.apply) {
            console.log.apply(console, args);
        }
    }
    catch (e) {
        console.error(e);
    }
};

var Log = function() {
    this._prefix = false;
    this._level = DEBUG;
    this._logger = consoleLogger;

    return this;
};

Log.prototype._log = function(level, args) {
    var stackTrace = printStackTrace({
        // stacktrace.js will try to get the source via AJAX to guess anonymous functions.
        // It is necessary to disable AJAX requests in production to avoid unwanted traffic.
        guess: false
    });
    var d = new Date();
    this._logger({
        datetime: getISODateTime(d),
        level: level,
        prefix: this.getPrefix(),
        args: args,
        stackTrace: stackTrace
    });
};

Log.prototype.setPrefix = function(prefix) {
    if (typeof prefix !== 'undefined') {
        this._prefix = prefix;
    } else {
        this._prefix = false;
    }
};

Log.prototype.getPrefix = function() {
    return (this._prefix !== false) ? this._prefix : '';
};

Log.prototype.setLogger = function(logger) {
    if (typeof logger !== 'undefined' && typeof logger === 'function') {
        this._logger = logger;
    } else if (typeof logger !== 'undefined' && typeof logger === 'string') {
        var log_loggers = {
            'console': consoleLogger
        };
        this._logger = log_loggers[logger];

        if (typeof this._logger === 'undefined') {
            this._logger = function nullLogger(logger) { }; // default
        }
    }
};

Log.prototype.getLogger = function() {
    return this._logger;
};

Log.prototype.setLevel = function(level) {
    if (typeof level !== 'undefined' && typeof level === 'number') {
        this._level = level;
    } else if (typeof level !== 'undefined' && typeof level === 'string') {
        var log_levels = {
            'trace': TRACE,
            'debug': DEBUG,
            'info': INFO,
            'warn': WARN,
            'error': ERROR
        };
        this._level = log_levels[level];
        if (typeof this._level === 'undefined') {
            this._level = NONE; // default
        }
    }
};

Log.prototype.getLevel = function() {
    return this._level;
};

Log.prototype.log = function() {
    this._log('', Array.prototype.slice.call(arguments));
};

Log.prototype.trace = function() {
    var level = this._level;
    if (level <= TRACE) {
        this._log('T', Array.prototype.slice.call(arguments));
    }
};

Log.prototype.debug = function() {
    if (this._level <= DEBUG) {
        this._log('D', Array.prototype.slice.call(arguments));
    }
};

Log.prototype.info = function() {
    if (this._level <= INFO) {
        this._log('I', Array.prototype.slice.call(arguments));
    }
};

Log.prototype.warn = function() {
    if (this._level <= WARN) {
        this._log('W', Array.prototype.slice.call(arguments));
    }
};

Log.prototype.error = function() {
    if (this._level <= ERROR) {
        this._log('E', Array.prototype.slice.call(arguments));
    }
};

var log = new Log();

module.exports = {
    setLevel: function() {
        log.setLevel.apply(log, Array.prototype.slice.call(arguments));
    },
    getLevel: function() {
        return log.getLevel.apply(log, Array.prototype.slice.call(arguments));
    },
    setLogger: function() {
        log.setLogger.apply(log, Array.prototype.slice.call(arguments));
    },
    getLogger: function() {
        return log.getLogger.apply(log, Array.prototype.slice.call(arguments));
    },
    setPrefix: function() {
        log.setPrefix.apply(log, Array.prototype.slice.call(arguments));
    },
    getPrefix: function() {
        return log.getPrefix.apply(log, Array.prototype.slice.call(arguments));
    },
    log: function() {
        return log.log.apply(log, Array.prototype.slice.call(arguments));
    },
    trace: function() {
        return log.trace.apply(log, Array.prototype.slice.call(arguments));
    },
    debug: function() {
        return log.debug.apply(log, Array.prototype.slice.call(arguments));
    },
    info: function() {
        return log.info.apply(log, Array.prototype.slice.call(arguments));
    },
    warn: function() {
        return log.warn.apply(log, Array.prototype.slice.call(arguments));
    },
    error: function() {
        return log.error.apply(log, Array.prototype.slice.call(arguments));
    }
};
