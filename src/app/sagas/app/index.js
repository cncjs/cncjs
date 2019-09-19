/* eslint import/no-dynamic-require: 0 */
import _get from 'lodash/get';
import _values from 'lodash/values';
import moment from 'moment';
import pubsub from 'pubsub-js';
import qs from 'qs';
import { all, call, delay, fork, put, race } from 'redux-saga/effects';
import { TRACE, DEBUG, INFO, WARN, ERROR } from 'universal-logger';
import {
    UPDATE_CONTROLLER_SETTINGS,
    UPDATE_CONTROLLER_STATE,
} from 'app/actions/controller';
import settings from 'app/config/settings';
import {
    appInit,
    appInitSuccess,
    appInitFailure,
} from 'app/containers/App/actions';
import i18next from 'app/i18next';
import controller from 'app/lib/controller';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import reduxStore from 'app/store/redux';
import configStore from 'app/store/config';

export function* init() {
    yield put(appInit());
    try {
        const { timeout } = yield race({
            init: call(initAll),
            timeout: delay(30000),
        });

        if (timeout) {
            throw new Error('Timeout Error');
        }

        log.info(`${settings.productName} ${settings.version}`);

        // Cross-origin communication
        window.addEventListener('message', (event) => {
            // TODO: event.origin

            const { token = '', action } = { ...event.data };

            // Token authentication
            if (token !== configStore.get('session.token')) {
                log.warn(`Received a message with an unauthorized token (${token}).`);
                return;
            }

            const { type, payload } = { ...action };
            if (type === 'connect') {
                pubsub.publish('message:connect', payload);
            } else if (type === 'resize') {
                pubsub.publish('message:resize', payload);
            } else {
                log.warn(`No valid action type (${type}) specified in the message.`);
            }
        }, false);

        { // Prevent browser from loading a drag-and-dropped file
            // @see http://stackoverflow.com/questions/6756583/prevent-browser-from-loading-a-drag-and-dropped-file
            window.addEventListener('dragover', (e) => {
                e.preventDefault();
            }, false);

            window.addEventListener('drop', (e) => {
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

        controller.addListener('controller:settings', (type, settings) => {
            reduxStore.dispatch({
                type: UPDATE_CONTROLLER_SETTINGS,
                payload: { type, settings },
            });
        });

        controller.addListener('controller:state', (type, state) => {
            reduxStore.dispatch({
                type: UPDATE_CONTROLLER_STATE,
                payload: { type, state },
            });
        });

        yield put(appInitSuccess());
    } catch (error) {
        const errorMessage = _get(error, 'message', error);
        yield put(appInitFailure(errorMessage));
    } finally {
        // TODO
    }
}

export function* process() {
    yield all(_values({}).map(it => fork(it)));
}

function* initAll() {
    try {
        // sequential
        yield call(configureLogLevel);

        // parallel
        yield all([
            call(configureMomentLocale),
            call(configureSessionToken),
        ]);
    } catch (error) {
        throw new Error(error);
    }
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
