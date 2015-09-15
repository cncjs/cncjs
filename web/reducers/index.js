import { combineReducers } from 'redux';
import gcode from './gcode';
import port from './port';

export default combineReducers({
    gcode,
    port
});
