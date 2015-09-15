// Module dependencies
var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    i18n = require('i18next'),
    urljoin = require('../lib/urljoin'),
    settings = require('../config/settings');

module.exports.view = function(req, res, next) {

    var view = req.params[0] || 'index';
    var file = view + '.hbs';

    if (fs.existsSync(path.resolve(__dirname, '..', 'views', file))) {
        var cdn, webroot, version, lng;

        // cdn
        if (_.isEmpty(settings.cdn.uri)) {
            cdn = urljoin(settings.assets['web'].routes[0], '/'); // with trailing slash
        } else {
            cdn = urljoin(settings.cdn.uri, settings.assets['web'].routes[0], '/'); // with trailing slash
        }

        // webroot
        webroot = urljoin(settings.assets['web'].routes[0], '/'); // with trailing slash

        // version
        version = settings.version;

        // lng
        lng = res.locals.i18n.lng();
        if (settings.supportedLngs.indexOf(lng) < 0) {
            lng = settings.i18next.fallbackLng || settings.supportedLngs[0];
            i18n.persistCookie(req, res, lng); // set cookie value for the languge
        }

        // Override IE's Compatibility View Settings
        // http://stackoverflow.com/questions/6156639/x-ua-compatible-is-set-to-ie-edge-but-it-still-doesnt-stop-compatibility-mode
        res.set({ 'X-UA-Compatible': 'IE=edge' });

        res.render(file, {
            'livereload': !!settings.livereload.enable,
            'cdn': cdn,
            'webroot': webroot,
            'version': version,
            'lang': lng,
            'title': res.locals.t('title'),
            'dir': res.locals.t('config:dir'),
            'loading': res.locals.t('loading'),
            partials: {
                loading: 'loading' // views/loading.hbs
            }
        });

        return;
    }

    next();
};
