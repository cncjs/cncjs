/* eslint import/no-dynamic-require: 0 */
import series from 'async/series';
import moment from 'moment';
import React from 'react';
import ReactDOM from 'react-dom';
import {
    HashRouter as Router,
    Route
} from 'react-router-dom';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import XHR from 'i18next-xhr-backend';
import settings from './config/settings';
import controller from './lib/controller';
import log from './lib/log';
import { toQueryObject } from './lib/query';
import user from './lib/user';
import store from './store';
import App from './containers/App';
import Login from './containers/Login';
import ProtectedRoute from './components/ProtectedRoute';
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
        const token = store.get('session.token');
        user.signin({ token: token })
            .then(({ authenticated, token }) => {
                if (authenticated) {
                    log.debug('Create and establish a WebSocket connection');
                    controller.connect(() => {
                        // @see "src/web/containers/Login/Login.jsx"
                        next();
                    });
                    return;
                }
                next();
            });
    },
    (next) => {
        i18next
            .use(XHR)
            .use(LanguageDetector)
            .init(settings.i18next, (t) => {
                next();
            });
    },
    (next) => {
        const locale = i18next.language;
        if (locale === 'en') {
            next();
            return;
        }

        require('bundle-loader!moment/locale/' + locale)(() => {
            log.debug(`moment: locale=${locale}`);
            moment().locale(locale);
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

    ReactDOM.render(
        <Router>
            <div>
                <Route path="/login" component={Login} />
                <ProtectedRoute path="/" component={App} />
            </div>
        </Router>,
        container
    );
});
