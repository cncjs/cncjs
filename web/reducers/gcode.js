import _ from 'lodash';
import { GCODE_LOAD, GCODE_UNLOAD } from '../actions';

const defaults = {
    data: ''
};

export default function (state = defaults, action) {
    switch (action.type) {
        case GCODE_LOAD:
            return _.extend({}, state, { data: action.data });

        case GCODE_UNLOAD:
            return _.extend({}, state, { data: '' });

        default:
            return state;
    }
}
