import { call, delay, put, race, takeLatest } from 'redux-saga/effects';
import {
  FETCH_PORTS,
  FETCH_BAUD_RATES,
} from '@app/actions/serialport';
import controller from '@app/lib/controller';
import log from '@app/lib/log';
import promisify from '@app/lib/promisify';

const asyncFetchPorts = promisify(controller.getPorts, {
  errorFirst: true,
  thisArg: controller
});

const asyncFetchBaudRates = promisify(controller.getBaudRates, {
  errorFirst: true,
  thisArg: controller
});

export function* init() {
  yield null;
}

export function* process() {
  yield takeLatest(FETCH_PORTS.REQUEST, fetchPorts);
  yield takeLatest(FETCH_BAUD_RATES.REQUEST, fetchBaudRates);
}

function* fetchPorts(action) {
  try {
    const { ports, timeout } = yield race({
      ports: call(asyncFetchPorts),
      timeout: delay(5000), // Constrains the response within a 5 seconds timeout.
    });

    if (timeout) {
      throw new Error('The request has timed out.');
    }

    log.debug('Received a list of available serial ports:', ports);

    yield put({
      type: FETCH_PORTS.SUCCESS,
      payload: { ports },
    });
  } catch (e) {
    const error = new Error(e.message);
    yield put({
      type: FETCH_PORTS.FAILURE,
      payload: error,
    });
  }
}

function* fetchBaudRates(action) {
  try {
    const { baudRates, timeout } = yield race({
      baudRates: call(asyncFetchBaudRates),
      timeout: delay(5000), // Constrains the response within a 5 seconds timeout.
    });

    if (timeout) {
      throw new Error('The request has timed out.');
    }

    log.debug('Received a list of supported baud rates:', baudRates);

    yield put({
      type: FETCH_BAUD_RATES.SUCCESS,
      payload: { baudRates },
    });
  } catch (e) {
    const error = new Error(e.message);
    yield put({
      type: FETCH_BAUD_RATES.FAILURE,
      payload: error,
    });
  }
}
