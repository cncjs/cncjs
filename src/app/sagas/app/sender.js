import {
    UPDATE_BOUNDING_BOX,
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

    // TODO: Compute the bounding box from backend controller
    controller.addListener('sender:unload', (status) => {
        const boundingBox = {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 },
        };

        reduxStore.dispatch({
            type: UPDATE_BOUNDING_BOX,
            payload: { boundingBox },
        });
    });

    yield null;
}

export function* process() {
    yield null;
}
