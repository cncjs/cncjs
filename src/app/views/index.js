import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import i18next from 'i18next';
import urljoin from '../lib/urljoin';
import settings from '../config/settings';

const views = (req, res, next) => {
    let view = req.params[0] || 'index';
    let file = view + '.hbs';

    if (fs.existsSync(path.resolve(__dirname, '..', 'views', file))) {
        let cdn, webroot, version;

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

        let lng = req.language;
        let lngs = req.languages;
        let t = req.t;

        // Override IE's Compatibility View Settings
        // http://stackoverflow.com/questions/6156639/x-ua-compatible-is-set-to-ie-edge-but-it-still-doesnt-stop-compatibility-mode
        res.set({ 'X-UA-Compatible': 'IE=edge' });

        res.render(file, {
            'livereload': !!settings.livereload.enable,
            'cdn': cdn,
            'webroot': webroot,
            'version': version,
            'lang': lng,
            'title': t('title'),
            'dir': t('config:dir'),
            'loading': t('loading'),
            partials: {
                loading: 'loading' // views/loading.hbs
            }
        });

        return;
    }

    next();
};

export default views;
