/* eslint import/no-dynamic-require: 0 */
import series from 'async/series';
import moment from 'moment';
import React from 'react';
import ReactDOM from 'react-dom';
import { createHashHistory } from 'history';
import { Router, Route, IndexRoute, useRouterHistory } from 'react-router';
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
import './styles/vendor.styl';
import './styles/app.styl';

const requireAuth = function (nextState, replace) {
    if (!user.authenticated()) {
        replace({
            pathname: '/login',
            state: {
                nextPathname: nextState.location.pathname
            }
        });
    }
};

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
                    controller.connect(); // @see also: src/web/containers/Login/Login.jsx
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

        require('bundle!moment/locale/' + locale)(() => {
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

    const hashHistory = useRouterHistory(createHashHistory)();
    const Empty = () => <div />;

    ReactDOM.render(
        <Router history={hashHistory}>
            <Route path="/" component={App}>
                <IndexRoute component={Empty} />
                <Route
                    path="login"
                    component={Empty}
                    onEnter={(nextState, replace) => {
                        if (user.authenticated()) {
                            replace('/');
                        }
                    }}
                />
                <Route
                    path="logout"
                    component={Empty}
                    onEnter={(nextState, replace) => {
                        if (user.authenticated()) {
                            log.debug('Destroy and cleanup the WebSocket connection');
                            controller.disconnect();

                            user.signout();
                            replace('/');
                        }
                    }}
                />
                <Route path="workspace" component={Empty} onEnter={requireAuth} />
                <Route path="settings" component={Empty} onEnter={requireAuth}>
                    <Route path="general" component={Empty} onEnter={requireAuth} />
                    <Route path="account" component={Empty} onEnter={requireAuth} />
                    <Route path="about" component={Empty} onEnter={requireAuth} />
                </Route>
            </Route>
        </Router>,
        container
    );
});
