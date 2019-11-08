/* eslint import/no-dynamic-require: 0 */
import _get from 'lodash/get';
import pubsub from 'pubsub-js';
import { all, call, delay, fork, put, race } from 'redux-saga/effects';
import settings from 'app/config/settings';
import {
    appInit,
    appInitSuccess,
    appInitFailure,
} from 'app/containers/App/actions';
import log from 'app/lib/log';
import configStore from 'app/store/config';
import * as bootstrapSaga from './bootstrap';
import * as connectionSaga from './connection';
import * as controllerSaga from './controller';
import * as feederSaga from './feeder';
import * as senderSaga from './sender';
import * as workflowSaga from './workflow';

const sagas = [
    bootstrapSaga,
    connectionSaga,
    controllerSaga,
    feederSaga,
    senderSaga,
    workflowSaga,
];

export function* init() {
    try {
        yield put(appInit());

        const { timeout } = yield race({
            init: all(sagas.map(saga => call(saga.init))),
            timeout: delay(60 * 1000),
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

        { // Hide loading
            const loading = document.getElementById('loading');
            loading && loading.remove();
        }

        { // Change backgrond color after loading complete
            const body = document.querySelector('body');
            body.style.backgroundColor = '#222'; // sidebar background color
        }

        yield put(appInitSuccess());
    } catch (error) {
        const errorMessage = _get(error, 'message', error);
        yield put(appInitFailure(errorMessage));
    } finally {
        // TODO
    }
}

export function* process() {
    yield all(sagas.map(saga => fork(saga.process)));
}
