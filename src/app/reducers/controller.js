import { createReducer } from 'redux-action';
import {
    UPDATE_CONTROLLER_SETTINGS,
    UPDATE_CONTROLLER_STATE,
} from 'app/actions/controller';

const initialState = {
    type: null,
    settings: {},
    state: {},
};

const reducer = createReducer(initialState, {
    [UPDATE_CONTROLLER_SETTINGS]: ({ type, settings }) => ({
        type,
        settings,
    }),
    [UPDATE_CONTROLLER_STATE]: ({ type, state }) => ({
        type,
        state,
    }),
});

export default reducer;
