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

export const {
  UPDATE_CONNECTION_STATUS,
} = constants(NS, [
  'UPDATE_CONNECTION_STATUS',
]);

export const fetchPorts = createAction(FETCH_PORTS.REQUEST);
export const fetchBaudRates = createAction(FETCH_BAUD_RATES.REQUEST);
export const updateConnectionStatus = createAction(UPDATE_CONNECTION_STATUS);
