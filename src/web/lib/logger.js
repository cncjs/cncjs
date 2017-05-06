/* eslint no-console: 0 */
import StackTrace from 'stacktrace-js';
import defaultHandler from './logger-default';

class LogLevel {
    name = '';
    value = 9999;

    constructor(level) {
        const { name, value } = { ...level };

        if (typeof name !== 'string' || !name) {
            throw new Error(`The given name (${name}) is not a valid string.`);
        }
        if (typeof value !== 'number') {
            throw new Error(`The given value (${value}) is not a valid number.`);
        }

        this.name = String(name || '');
        this.value = Number(value) || 0;
    }
}

// Predefined logging levels.
const TRACE = new LogLevel({ name: 'trace', value: 0 });
const DEBUG = new LogLevel({ name: 'debug', value: 1 });
const INFO = new LogLevel({ name: 'info', value: 2 });
const WARN = new LogLevel({ name: 'warn', value: 3 });
const ERROR = new LogLevel({ name: 'error', value: 4 });
const OFF = new LogLevel({ name: 'off', value: 9999 });

class Logger {
    name = '';
    level = OFF;
    stacktrace = {
        // Set `offline` to true to prevent all network requests
        offline: true
    };
    chainedHandlers = [];

    constructor(name, options) {
        if (typeof name === 'object') {
            options = name;
            name = '';
        }

        const { level = this.level, stacktrace = this.stacktrace } = { ...options };
        this.name = name;
        this.setLevel(level);
        this.stacktrace = {
            ...this.stacktrace,
            ...stacktrace
        };
    }
    invokeChainedHandlers(level, messages) {
        let i = 0;

        const context = {
            name: this.name,
            level: level,
            stackframes: []
        };
        const next = () => {
            const handler = (i < this.chainedHandlers.length) ? this.chainedHandlers[i] : null;
            if (!handler) {
                return;
            }

            ++i;
            handler(context, messages, next);
        };

        if (this.stacktrace) {
            StackTrace
                .get(this.stacktrace)
                .then(stackframes => {
                    context.stackframes = stackframes;
                    next();
                });
        } else {
            next();
        }
    }
    use(handler) {
        if (typeof handler === 'function') {
            this.chainedHandlers.push(handler);
        }
        return this;
    }
    // Changes the current logging level for the logging instance
    setLevel(level) {
        if (level instanceof LogLevel) {
            this.level = level;
        }

        return this.level;
    }
    // Returns the current logging level fo the logging instance
    getLevel() {
        return this.level;
    }
    log(level, ...messages) {
        if ((level instanceof LogLevel) && (level.value >= this.level.value)) {
            this.invokeChainedHandlers(level, messages);
        }
    }
    trace(...messages) {
        if (TRACE.value >= this.level.value) {
            this.invokeChainedHandlers(TRACE, messages);
        }
    }
    debug(...messages) {
        if (DEBUG.value >= this.level.value) {
            this.invokeChainedHandlers(DEBUG, messages);
        }
    }
    info(...messages) {
        if (INFO.value >= this.level.value) {
            this.invokeChainedHandlers(INFO, messages);
        }
    }
    warn(...messages) {
        if (WARN.value >= this.level.value) {
            this.invokeChainedHandlers(WARN, messages);
        }
    }
    error(...messages) {
        if (ERROR.value >= this.level.value) {
            this.invokeChainedHandlers(ERROR, messages);
        }
    }
}

const globalLogger = new Logger({
    level: DEBUG,
    stacktrace: true
});
const contextualLoggers = {};

module.exports = (name, options) => {
    name = String(name || '');

    if (!name) {
        throw new Error('The logger name cannot be an empty string.');
    }

    if (!contextualLoggers[name]) {
        const {
            level = globalLogger.level,
            stacktrace = globalLogger.stacktrace
        } = { ...options };
        contextualLoggers[name] = new Logger(name, { level, stacktrace });
    }

    return contextualLoggers[name];
};

module.exports.TRACE = TRACE;
module.exports.DEBUG = DEBUG;
module.exports.INFO = INFO;
module.exports.WARN = WARN;
module.exports.ERROR = ERROR;

module.exports.defaultHandler = defaultHandler;

module.exports.defineLogLevel = (name, value) => {
    return new LogLevel(name, value);
};

module.exports.use = (handler) => {
    globalLogger.use(handler);

    return globalLogger;
};

module.exports.setLevel = (level) => {
    globalLogger.setLevel(level);

    // Apply filter level to all registered contextual loggers
    Object.keys(contextualLoggers).forEach(key => {
        const logger = contextualLoggers[key];
        logger.setLevel(level);
    });

    return globalLogger.getLevel();
};

module.exports.getLevel = () => {
    return globalLogger.getLevel();
};

module.exports.log = globalLogger.log.bind(globalLogger);

[TRACE, DEBUG, INFO, WARN, ERROR].forEach(level => {
    module.exports[level.name] = globalLogger[level.name].bind(globalLogger);
});
