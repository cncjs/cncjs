import {
    UPDATE_CONTROLLER_SETTINGS,
    UPDATE_CONTROLLER_STATE,
} from 'app/actions/controller';
import controller from 'app/lib/controller';
import reduxStore from 'app/store/redux';

export function* init() {
    controller.addListener('controller:settings', (type, settings) => {
        reduxStore.dispatch({
            type: UPDATE_CONTROLLER_SETTINGS,
            payload: { type, settings },
        });
    });

    controller.addListener('controller:state', (type, state) => {
        reduxStore.dispatch({
            type: UPDATE_CONTROLLER_STATE,
            payload: { type, state },
        });
    });

    yield null;
}

export function* process() {
    yield null;
}
