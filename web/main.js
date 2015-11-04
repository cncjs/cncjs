import _ from 'lodash';
import async from 'async';
import i18n from 'i18next';
import Uri from 'jsUri';
import log from './lib/log';
import app from './app';
import settings from './config/settings';
import sha1 from 'sha1';
import './styles/vendor.css';
import './styles/app.css';

var query_params = (function(qs) {
    qs = String(qs || '');
    if (qs[0] !== '?') {
        qs = '?' + qs;
    }
    var uri = new Uri(qs);
    var obj = _.reduce(uri.queryPairs, function(obj, item) {
        var key = item[0], value = item[1];
        obj[key] = decodeURIComponent(value);
        return obj;
    }, {});

    return obj;
}(window.root.location.search)) || {};

// https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
function cookie_get(key) {
    if ( ! key) {
        return null;
    }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
}

function registerI18nHelpers(i18n) {
    i18n = i18n || {};
    i18n._ = function() {
        var args = Array.prototype.slice.call(arguments);
        if (_.size(args) === 0 || _.isEmpty(args[0])) {
            i18n.t.apply(i18n, args);
            return;
        }

        var value = args[0];
        var options = args[1] || {};
        var key = sha1(value);
        args[0] = value;

        options.defaultValue = value;

        return i18n.t(key, options);
    };
}

async.series([
    // i18next
    function i18next_init(next) {
        var lng;

        registerI18nHelpers(i18n);
        
        // 1. query string: lang=en
        lng = query_params[settings.i18next.detectLngQS] || '';

        // 2. cookie
        lng = lng || (function(lng) {
            if (settings.i18next.useCookie) {
                return cookie_get(settings.i18next.cookieName);
            }
            return lng;
        }(lng));
        
        // 3. Using 'lang' attribute on the html element
        lng = lng || $('html').attr('lang');

        // Lowercase countryCode in requests
        lng = (lng || '').toLowerCase();

        if (settings.supportedLngs.indexOf(lng) >= 0) {
            settings.i18next.lng = lng;
        } else {
            settings.i18next.lng = settings.i18next.fallbackLng || settings.supportedLngs[0];
        }

        i18n.init(settings.i18next, function(t) {
            next();
        });
    },
    // logger
    function log_init(next) {
        var log_level = query_params['log_level'] || settings.log.level;
        var log_logger = query_params['log_logger'] || settings.log.logger;
        var log_prefix = query_params['log_prefix'] || settings.log.prefix;

        log.setLevel(log_level);
        log.setLogger(log_logger);
        log.setPrefix(log_prefix);

        var msg = [
            'version=' + settings.version,
            'webroot=' + settings.webroot,
            'cdn=' + settings.cdn
        ];
        log.info(msg.join(','));

        next();
    }
], function(err, results) {

    var loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }

    app();
});
