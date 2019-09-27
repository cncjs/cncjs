import _get from 'lodash/get';
import { createReducer } from 'redux-action';
import {
    OPEN_CONNECTION,
    CLOSE_CONNECTION,
    UPDATE_CONNECTION,
} from 'app/actions/connection';
import {
    CONNECTION_STATE_CONNECTING,
    CONNECTION_STATE_CONNECTED,
    CONNECTION_STATE_DISCONNECTING,
    CONNECTION_STATE_DISCONNECTED,
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_SOCKET,
} from 'app/constants/connection';

const initialState = {
    error: null,
    state: CONNECTION_STATE_DISCONNECTED,
    type: null,
    [CONNECTION_TYPE_SERIAL]: {
        path: null,
        baudRate: null,
        rtscts: null,
    },
    [CONNECTION_TYPE_SOCKET]: {
        host: null,
        port: null,
    },
};

const reducer = createReducer(initialState, {
    [OPEN_CONNECTION.REQUEST]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_CONNECTING,
    }),
    [OPEN_CONNECTION.SUCCESS]: (payload, state) => ({
        ...state,
        error: null,
        state: CONNECTION_STATE_CONNECTED,
    }),
    [OPEN_CONNECTION.FAILURE]: (payload, state) => ({
        ...state,
        error: payload,
        state: CONNECTION_STATE_DISCONNECTED,
    }),
    [CLOSE_CONNECTION.REQUEST]: (payload, state) => ({
        ...state,
        state: CONNECTION_STATE_DISCONNECTING,
    }),
    [CLOSE_CONNECTION.SUCCESS]: (payload, state) => ({
        ...state,
        error: null,
        state: CONNECTION_STATE_DISCONNECTED,
    }),
    [CLOSE_CONNECTION.FAILURE]: (payload, state) => ({
        ...state,
        error: payload,
        state: CONNECTION_STATE_DISCONNECTED,
    }),

    // @param {string} [payload.state] Connection state.
    // @param {string} [payload.type] Connection type.
    // @param {object} [payload.options] Connection options.
    [UPDATE_CONNECTION]: (payload, state) => {
        const connectionState = _get(payload, 'state', _get(state, 'state'));
        const connectionType = _get(payload, 'type', _get(state, 'type'));
        const connectionOptions = _get(payload, 'options', _get(state, `[${connectionType}]`));

        return {
            ...state,
            state: connectionState,
            type: connectionType,
            [connectionType]: { ...connectionOptions },
        };
    },
});

export default reducer;
