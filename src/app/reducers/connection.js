import _get from 'lodash/get';
import { createReducer } from 'redux-action';
import {
  OPEN_CONNECTION,
  CLOSE_CONNECTION,
  UPDATE_CONNECTION,
} from '@app/actions/connection';
import {
  CONNECTION_STATE_CONNECTING,
  CONNECTION_STATE_DISCONNECTED,
  CONNECTION_STATE_DISCONNECTING,
  CONNECTION_TYPE_SERIAL,
} from '@app/constants/connection';

const initialState = {
  error: null,
  state: CONNECTION_STATE_DISCONNECTED, // 'state' is required and cannot be null
  type: CONNECTION_TYPE_SERIAL, // 'type' is required and cannot be null
  ident: null,
  options: null,
};

const reducer = createReducer(initialState, {
  [OPEN_CONNECTION.REQUEST]: ({ controller, connection }) => {
    return {
      error: null,
      state: CONNECTION_STATE_CONNECTING,

      // Assign 'type' and 'options' for a new connection request
      type: _get(connection, 'type', initialState.type),
      options: _get(connection, 'options', initialState.options),
    };
  },
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
    state: _get(payload, 'state', _get(state, 'state')) || initialState.state, // 'state' is required and cannot be null
    type: _get(payload, 'type', _get(state, 'type')) || initialState.type, // 'type' is required and cannot be null
    ident: _get(payload, 'ident', _get(state, 'ident')),
    options: _get(payload, 'options', _get(state, 'options')),
  }),
});

export default reducer;
