import { createReducer } from 'redux-action';
import {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
    UPDATE_CONNECTION,
} from 'app/actions/connection';

const CONNECTION_STATE_CONNECTING = 'connecting';
const CONNECTION_STATE_CONNECTED = 'connected';
const CONNECTION_STATE_DISCONNECTING = 'disconnecting';
const CONNECTION_STATE_DISCONNECTED = 'disconnected';

const initialState = {
    state: CONNECTION_STATE_DISCONNECTED,
    ident: null,
    type: null,
    settings: {},
};

const reducer = createReducer(initialState, {
    [OPEN_CONNECTION.REQUEST]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_CONNECTING,
    }),
    [OPEN_CONNECTION.SUCCESS]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_CONNECTED,
    }),
    [OPEN_CONNECTION.FAILURE]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_DISCONNECTED,
    }),
    [CLOSE_CONNECTION.REQUEST]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_DISCONNECTING,
    }),
    [CLOSE_CONNECTION.SUCCESS]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_DISCONNECTED,
    }),
    [CLOSE_CONNECTION.FAILURE]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_DISCONNECTED,
    }),
    [UPDATE_CONNECTION]: ({ ident, type, settings }, state) => ({
        ...state,
        ident,
        type,
        settings,
    }),
});

export default reducer;
