import {
    UPDATE_SENDER_STATUS,
} from 'app/actions/sender';
import controller from 'app/lib/controller';
import reduxStore from 'app/store/redux';

export function* init() {
    controller.addListener('sender:status', (status) => {
        reduxStore.dispatch({
            type: UPDATE_SENDER_STATUS,
            payload: { status },
        });
    });

    yield null;
}

export function* process() {
    yield null;
}
