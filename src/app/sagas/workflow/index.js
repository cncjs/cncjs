import {
    UPDATE_WORKFLOW_STATE,
} from 'app/actions/workflow';
import controller from 'app/lib/controller';
import reduxStore from 'app/store/redux';

export function* init() {
    controller.addListener('workflow:state', (state) => {
        reduxStore.dispatch({
            type: UPDATE_WORKFLOW_STATE,
            payload: { state },
        });
    });

    yield null;
}

export function* process() {
    yield null;
}
