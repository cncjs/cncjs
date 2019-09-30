import _get from 'lodash/get';
import { createReducer } from 'redux-action';
import {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
    UPDATE_CONNECTION,
} from 'app/actions/connection';
import {
    CONNECTION_STATE_CONNECTING,
    CONNECTION_STATE_DISCONNECTED,
    CONNECTION_STATE_DISCONNECTING,
} from 'app/constants/connection';

const initialState = {
    error: null,
    state: CONNECTION_STATE_DISCONNECTED,
    ident: null,
    type: null,
    options: null,
};

const reducer = createReducer(initialState, {
    [OPEN_CONNECTION.REQUEST]: () => ({
        error: null,
        state: CONNECTION_STATE_CONNECTING,
    }),
    [CLOSE_CONNECTION.REQUEST]: () => ({
        error: null,
        state: CONNECTION_STATE_DISCONNECTING,
    }),
    // @param {object} [payload.error] An error object indicating whether an error has occurred.
    // @param {string} [payload.state] The connection state. One of: 'connected', 'connecting', 'disconnected', 'disconnecting'
    // @param {string} [payload.type] The connection type. One of: 'serial', 'socket'
    // @param {string} [payload.ident] The connection ident.
    // @param {object} [payload.options] The connection options.
    [UPDATE_CONNECTION]: (payload, state) => ({
        error: _get(payload, 'error', _get(state, 'error')),
        state: _get(payload, 'state', _get(state, 'state')),
        type: _get(payload, 'type', _get(state, 'type')),
        ident: _get(payload, 'ident', _get(state, 'ident')),
        options: _get(payload, 'options', _get(state, 'options')),
    }),
});

export default reducer;
