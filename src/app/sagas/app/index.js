import _get from 'lodash/get';
import { all, call, delay, fork, put, race } from 'redux-saga/effects';
import settings from '@app/config/settings';
import {
  appInit,
  appInitSuccess,
  appInitFailure,
} from '@app/containers/App/actions';
import log from '@app/lib/log';
import * as bootstrapSaga from './bootstrap';

const sagas = [
  bootstrapSaga,
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
    log.error(error);
    const errorMessage = _get(error, 'message', error);
    yield put(appInitFailure(errorMessage));
  } finally {
    // TODO
  }
}

export function* process() {
  yield all(sagas.map(saga => fork(saga.process)));
}
