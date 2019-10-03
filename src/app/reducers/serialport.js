import ensureArray from 'ensure-array';
import { createReducer } from 'redux-action';
import {
    FETCH_PORTS,
    FETCH_BAUD_RATES,
} from 'app/actions/serialport';

const initialState = {
    // ports
    isFetchingPorts: false,
    ports: [],

    // baudRates
    isFetchingBaudRates: false,
    baudRates: [],
};

const reducer = createReducer(initialState, {
    [FETCH_PORTS.REQUEST]: () => ({
        isFetchingPorts: true,
    }),
    [FETCH_PORTS.SUCCESS]: ({ ports }) => ({
        isFetchingPorts: false,
        ports: ensureArray(ports),
    }),
    [FETCH_PORTS.FAILURE]: (error) => ({
        isFetchingPorts: false,
    }),
    [FETCH_BAUD_RATES.REQUEST]: () => ({
        isFetchingBaudRates: true,
    }),
    [FETCH_BAUD_RATES.SUCCESS]: ({ baudRates }) => ({
        isFetchingBaudRates: false,
        baudRates: ensureArray(baudRates),
    }),
    [FETCH_BAUD_RATES.FAILURE]: (error) => ({
        isFetchingBaudRates: false,
    }),
});

export default reducer;
