import _get from 'lodash/get';
import { createReducer } from 'redux-action';
import {
    UPDATE_FEEDER_STATUS,
} from 'app/actions/feeder';

const initialState = {
    status: null,
};

const reducer = createReducer(initialState, {
    [UPDATE_FEEDER_STATUS]: (payload, state) => ({
        status: _get(payload, 'status', _get(state, 'status')),
    }),
});

export default reducer;
