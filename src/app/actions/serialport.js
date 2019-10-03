import constants from 'namespace-constants';
import { createAction } from 'redux-action';

const NS = 'serialport';
const asyncTypes = ['REQUEST', 'SUCCESS', 'FAILURE'];

export const {
    FETCH_PORTS,
    FETCH_BAUD_RATES,
} = constants(NS, {
    'FETCH_PORTS': asyncTypes,
    'FETCH_BAUD_RATES': asyncTypes,
});

export const fetchPorts = createAction(FETCH_PORTS.REQUEST);
export const fetchBaudRates = createAction(FETCH_BAUD_RATES.REQUEST);
