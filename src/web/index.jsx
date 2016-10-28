/* eslint import/imports-first: 0 */
require('./polyfill');

import series from 'async/series';
import React from 'react';
import ReactDOM from 'react-dom';
import { createHashHistory } from 'history';
import { Router, Route, IndexRoute, useRouterHistory } from 'react-router';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import XHR from 'i18next-xhr-backend';
import settings from './config/settings';
import log from './lib/log';
import { toQueryObject } from './lib/query';
import App from './containers/App';
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

    { // Change backgrond color after loading complete
        const body = document.querySelector('body');
        body.style.backgroundColor = '#222'; // sidebar background color
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const hashHistory = useRouterHistory(createHashHistory)({ queryKey: false });
    const layoutToggler = () => <div />;

    ReactDOM.render(
        <Router history={hashHistory}>
            <Route path="/" component={App}>
                <IndexRoute component={layoutToggler} />
                <Route path="workspace" component={layoutToggler} />
                <Route path="settings" component={layoutToggler} />
            </Route>
        </Router>,
        container
    );
});
