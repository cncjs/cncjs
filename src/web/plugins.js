/* eslint no-console: 0, no-var: 0 */
var root = this.parent || this;

// Define global variables
root.app = root.app || {};
root.app.config = root.app.config || {};
root.app.window = this;
root.app.version = root.app.version || (new Date()).getTime();
root.app.webroot = root.app.webroot || '/';
root.app.cdn = root.app.cdn || '/';

window.root = root;

// Change the document title
root.window.document.title = window.document.title;

// Avoid `console` errors in browsers that lack a console.
(function(global) {
    var method;
    var noop = function noop() {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }

        // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
        if (Function.prototype.bind && window.console && typeof console.log === 'object') {
            var that = Function.prototype.call;
            console[method] = that.bind(console[method], console);
        }
    }
}(this));

// Parse data-version, data-webroot, and data-cdn attributes from the script tag
(function(global) {
    // Helper function for iterating over an array backwards. If the func
    // returns a true value, it will break out of the loop.
    var eachReverse = function(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    };

    var scripts = document.getElementsByTagName('script') || [];
    eachReverse(scripts, (script) => {
        if (script.getAttribute('data-version')) {
            root.app.config.version = script.getAttribute('data-version') || root.app.config.version;
            root.app.config.webroot = script.getAttribute('data-webroot') || root.app.config.webroot;
            root.app.config.cdn = script.getAttribute('data-cdn') || root.app.config.cdn;
            return true;
        }

        return false;
    });
}(this));

// Clears HTML5 Local Storage while rolling out a new version
// Cache invalidation may affect with some modules while they are using HTML5 Local Storage for production.
(function(global) {
    if (window.Modernizr && window.Modernizr.localstorage) {
        var version = root.app.config.version;

        // localStorage is available
        var localVersion = window.localStorage.getItem('version');
        if (!localVersion || localVersion !== version) {
            window.localStorage.clear(); // clear local
            window.localStorage.setItem('version', version);
        }
    }
}(this));
