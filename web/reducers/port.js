import { PORT_OPEN, PORT_CLOSE } from '../actions';

export default function (state = '', action) {
    switch (action.type) {
        case PORT_OPEN:
            return action.port;
        case PORT_CLOSE:
            return '';
        default:
            return state;
    }
}
