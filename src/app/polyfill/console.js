// Avoid `console` errors in browsers that lack a console.
(function(global) {
    window.console = window.console || {};

    const noop = function noop() {};
    const console = window.console;
    const methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    let length = methods.length;

    while (length--) {
        const method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }

        // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
        if (Function.prototype.bind && window.console && typeof console.log === 'object') {
            const that = Function.prototype.call;
            console[method] = that.bind(console[method], console);
        }
    }
}(this));
