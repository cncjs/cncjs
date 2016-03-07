import _ from 'lodash';
import async from 'async';
import Uri from 'jsuri';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute } from 'react-router';
import settings from './config/settings';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import XHR from 'i18next-xhr-backend';
import log from './lib/log';
import App from './containers/App';
import Workspace from './components/workspace';
import './styles/vendor.styl';
import './styles/app.styl';

const queryparams = ((qs) => {
    qs = String(qs || '');
    if (qs[0] !== '?') {
        qs = '?' + qs;
    }
    let uri = new Uri(qs);
    let obj = _.reduce(uri.queryPairs, (obj, item) => {
        let key = item[0], value = item[1];
        obj[key] = decodeURIComponent(value);
        return obj;
    }, {});

    return obj;
})(window.root.location.search) || {};

async.series([
    (next) => {
        i18next
            .use(XHR)
            .use(LanguageDetector)
            .init(settings.i18next, (t) => {
                next();
            });
    },
    (next) => {
        const level = queryparams.log_level || settings.log.level;
        const logger = queryparams.log_logger || settings.log.logger;
        const prefix = queryparams.log_prefix || settings.log.prefix;

        log.setLevel(level);
        log.setLogger(logger);
        log.setPrefix(prefix);

        let msg = [
            'version=' + settings.version,
            'webroot=' + settings.webroot,
            'cdn=' + settings.cdn
        ];
        log.info(msg.join(','));

        next();
    }
], (err, results) => {
    { // Prevent browser from loading a drag-and-dropped file
      // http://stackoverflow.com/questions/6756583/prevent-browser-from-loading-a-drag-and-dropped-file
        window.addEventListener('dragover', (e) => {
            e = e || event;
            e.preventDefault();
        }, false);

        window.addEventListener('drop', (e) => {
            e = e || event;
            e.preventDefault();
        }, false);
    }

    { // Hide loading
        let loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    ReactDOM.render(
        <Router>
            <Route path="/" component={App}>
                <IndexRoute component={Workspace} />
            </Route>
        </Router>,
        document.querySelector('#container')
    );
});
