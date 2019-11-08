import _get from 'lodash/get';
import { createReducer } from 'redux-action';
import {
    UPDATE_SENDER_STATUS,
} from 'app/actions/sender';

const initialState = {
    status: null,
};

const reducer = createReducer(initialState, {
    [UPDATE_SENDER_STATUS]: (payload, state) => ({
        status: _get(payload, 'status', _get(state, 'status')),
    }),
});

export default reducer;
