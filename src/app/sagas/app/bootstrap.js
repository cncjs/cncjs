/* eslint import/no-dynamic-require: 0 */
import moment from 'moment';
import qs from 'qs';
import { all, call } from 'redux-saga/effects';
import { TRACE, DEBUG, INFO, WARN, ERROR } from 'universal-logger';
import settings from 'app/config/settings';
import i18next from 'app/i18next';
import controller from 'app/lib/controller';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import configStore from 'app/store/config';

export function* init() {
    // sequential
    yield call(configureLogLevel);

    // parallel
    yield all([
        call(configureMomentLocale),
        call(configureSessionToken),
    ]);
}

export function* process() {
    yield null;
}

const configureLogLevel = () => {
    const obj = qs.parse(window.location.search.slice(1));
    const level = {
        trace: TRACE,
        debug: DEBUG,
        info: INFO,
        warn: WARN,
        error: ERROR
    }[obj.log_level || settings.log.level];
    log.setLevel(level);
};

const configureMomentLocale = () => new Promise(resolve => {
    const lng = i18next.language;

    if (!lng || lng === 'en') {
        log.debug(`moment: lng=${lng}`);
        resolve();
        return;
    }

    const bundle = require('bundle-loader!moment/locale/' + lng);
    bundle(() => {
        log.debug(`moment: lng=${lng}`);
        moment().locale(lng);

        resolve();
    });
});

const configureSessionToken = () => new Promise(resolve => {
    const token = configStore.get('session.token');
    user.signin({ token: token })
        .then(({ authenticated, token }) => {
            if (authenticated) {
                log.debug('Create and establish a WebSocket connection');

                const host = '';
                const options = {
                    query: 'token=' + token
                };
                controller.connect(host, options, () => {
                    // @see "app/containers/Login/Login.jsx"
                    resolve();
                });
                return;
            }
            resolve();
        });
});
