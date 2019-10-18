import { fork, all, call } from 'redux-saga/effects';
import * as app from './app';
import * as connection from './connection';
import * as controller from './controller';
import * as serialport from './serialport';
import * as workflow from './workflow';

const programs = [
    app,
    connection,
    controller,
    serialport,
    workflow,
];

export default function* root() {
    yield all(programs.map(program => call(program.init)));
    yield all(programs.map(program => fork(program.process)));
}
