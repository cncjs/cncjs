import _ from 'lodash';
import settings from '../config/settings';
import ImmutableStore from '../lib/immutable-store';
import log from '../lib/log';

const defaultState = {
    workspace: {
        container: {
            default: [
                'visualizer'
            ],
            primary: [
                'connection', 'grbl', 'console'
            ],
            secondary: [
                'axes', 'gcode', 'probe', 'spindle'
            ]
        }
    },
    widgets: {
        axes: {
            jog: {
                selectedDistance: '1',
                customDistance: 10
            }
        },
        connection: {
            port: '',
            baudrate: 115200,
            autoReconnect: true
        },
        console: {
        },
        gcode: {
        },
        grbl: {
        },
        probe: {
            probeCommand: 'G38.2',
            probeDepth: 10,
            probeFeedrate: 20,
            tlo: 10,
            retractionDistance: 4
        },
        spindle: {
        },
        visualizer: {
        }
    }
};

let state;

try {
    let cnc = JSON.parse(localStorage.getItem('cnc') || {});
    log.debug('cnc:', cnc);

    state = _.merge({}, defaultState, cnc.state);
    
    { // Post-process the state after merging defaultState and cnc.state
        let defaultList = _.get(defaultState, 'workspace.container.default'); // always use defaultState
        let primaryList = _.get(cnc.state, 'workspace.container.primary');
        let secondaryList = _.get(cnc.state, 'workspace.container.secondary');

        if (defaultList) {
            _.set(state, 'workspace.container.default', defaultList);
        }
        if (primaryList) {
            _.set(state, 'workspace.container.primary', primaryList);
        }
        if (secondaryList) {
            _.set(state, 'workspace.container.secondary', secondaryList);
        }
    }

    { // Remove duplicate ones
        let defaultList = _.get(state, 'workspace.container.default');
        let primaryList = _.get(state, 'workspace.container.primary');
        let secondaryList = _.get(state, 'workspace.container.secondary');

        primaryList = _(primaryList) // Keep the order of primaryList
            .uniq()
            .difference(defaultList) // exclude defaultList
            .value();

        secondaryList = _(secondaryList) // Keep the order of secondaryList
            .uniq()
            .difference(primaryList) // exclude primaryList
            .difference(defaultList) // exclude defaultList
            .value();

        _.set(state, 'workspace.container.primary', primaryList);
        _.set(state, 'workspace.container.secondary', secondaryList);
    }
}
catch(err) {
    state = _.merge({}, defaultState);
}

const store = new ImmutableStore(state);

store.on('change', (state) => {
    let cnc = {
        version: settings.version,
        state: state
    };
    localStorage.setItem('cnc', JSON.stringify(cnc));
});

export default store;
