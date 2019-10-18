import _get from 'lodash/get';
import { createReducer } from 'redux-action';
import {
    UPDATE_WORKFLOW_STATE,
} from 'app/actions/workflow';
import {
    WORKFLOW_STATE_IDLE,
} from 'app/constants/workflow';

const initialState = {
    state: WORKFLOW_STATE_IDLE,
};

const reducer = createReducer(initialState, {
    // @param {string} [payload.state] The workflow state. One of: 'idle, 'paused', 'running'
    [UPDATE_WORKFLOW_STATE]: (payload, state) => ({
        state: _get(payload, 'state', _get(state, 'state')) || initialState.state, // 'state' is required and cannot be null
    }),
});

export default reducer;
