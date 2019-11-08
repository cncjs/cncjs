import {
    UPDATE_FEEDER_STATUS,
} from 'app/actions/feeder';
import controller from 'app/lib/controller';
import reduxStore from 'app/store/redux';

export function* init() {
    controller.addListener('feeder:status', (status) => {
        reduxStore.dispatch({
            type: UPDATE_FEEDER_STATUS,
            payload: { status },
        });
    });

    yield null;
}

export function* process() {
    yield null;
}
