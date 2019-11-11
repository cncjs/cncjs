import _get from 'lodash/get';
import { createReducer } from 'redux-action';
import {
    UPDATE_BOUNDING_BOX,
    UPDATE_SENDER_STATUS,
} from 'app/actions/sender';

const initialState = {
    boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
    },
    status: null,
};

const reducer = createReducer(initialState, {
    [UPDATE_BOUNDING_BOX]: (payload, state) => ({
        boundingBox: {
            ...state.boundingBox,
            ..._get(payload, 'boundingBox'),
        }
    }),
    [UPDATE_SENDER_STATUS]: (payload, state) => ({
        status: _get(payload, 'status', _get(state, 'status')),
    }),
});

export default reducer;
