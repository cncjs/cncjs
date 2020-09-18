import { fork, all, call } from 'redux-saga/effects';
import * as administration from './administration';
import * as app from './app';
import * as controller from './controller';
import * as serialport from './serialport';

const sagas = [
  administration,
  app,
  controller,
  serialport,
];

export default function* root() {
  yield all(sagas.map(saga => call(saga.init)));
  yield all(sagas.map(saga => fork(saga.process)));
}
