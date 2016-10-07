/* eslint import/imports-first: 0 */
require('./polyfill');

import _ from 'lodash';
import series from 'async/series';
import Uri from 'jsuri';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import XHR from 'i18next-xhr-backend';
import settings from './config/settings';
import log from './lib/log';
import { toQueryObject } from './lib/query';
import App from './containers/App';
import Workspace from './containers/Workspace';
import './styles/vendor.styl';
import './styles/app.styl';

series([
    (next) => {
        const qp = toQueryObject(window.location.search);
        const level = qp.log_level || settings.log.level;
        const logger = qp.log_logger || settings.log.logger;
        const prefix = qp.log_prefix || settings.log.prefix;

        log.setLevel(level);
        log.setLogger(logger);
        log.setPrefix(prefix);

        next();
    },
    (next) => {
        i18next
            .use(XHR)
            .use(LanguageDetector)
            .init(settings.i18next, (t) => {
                next();
            });
    }
], (err, results) => {
    log.info(`${settings.name} v${settings.version}`);

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
        const loading = document.getElementById('loading');
        loading && loading.remove();
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    ReactDOM.render(
        <Router history={browserHistory}>
            <Route path="/" component={App}>
                <IndexRoute component={Workspace} />
                <Route path="workspace" component={Workspace} />
            </Route>
        </Router>,
        container
    );
});
