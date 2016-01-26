import _ from 'lodash';
import ImmutableStore from '../lib/immutable-store';

const defaultState = {
    widgets: {
        axes: {
            state: {
                visibility: 'visible'
            },
            jog: {
                selectedDistance: '1',
                customDistance: 10
            }
        },
        connection: {
            state: {
                visibility: 'visible'
            },
            port: '',
            baudrate: 115200,
            autoReconnect: true
        },
        console: {
            state: {
                visibility: 'visible'
            }
        },
        gcode: {
            state: {
                visibility: 'visible'
            }
        },
        grbl: {
            state: {
                visibility: 'visible'
            }
        },
        probe: {
            state: {
                visibility: 'visible'
            },
            probeCommand: 'G38.2',
            probeDepth: 10,
            probeFeedrate: 20,
            tlo: 10,
            retractionDistance: 4
        },
        spindle: {
            state: {
                visibility: 'visible'
            }
        },
        visualizer: {
            state: {
                visibility: 'visible'
            }
        }
    }
};

let state;

try {
    let userState = JSON.parse(localStorage.getItem('state') || {});

    state = _.merge({}, defaultState, userState);
}
catch(err) {
    state = _.merge({}, defaultState);
}

const store = new ImmutableStore(state);

store.on('change', (state) => {
    localStorage.setItem('state', JSON.stringify(state));
});

export default store;
