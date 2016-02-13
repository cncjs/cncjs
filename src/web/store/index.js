import _ from 'lodash';
import settings from '../config/settings';
import ImmutableStore from '../lib/immutable-store';
import log from '../lib/log';
import request from 'superagent';

const migrate = () => { // schema change since v0.15.4
    // Clear localStorage
    localStorage.clear();

    // Remove "workspace" from ~/.cncrc
    request
        .del('/api/config')
        .query({ key: 'workspace' })
        .end((err, res) => {
        });
};

const defaultState = {
    workspace: {
        container: {
            default: {
                widgets: ['visualizer']
            },
            primary: {
                show: true,
                widgets: [
                    'connection', 'grbl', 'console', 'webcam'
                ]
            },
            secondary: {
                show: true,
                widgets: [
                    'axes', 'gcode', 'probe', 'spindle'
                ]
            }
        }
    },
    widgets: {
        axes: {
            jog: {
                selectedDistance: '1',
                customDistance: 10
            },
            shuttle: {
                feedrateMin: 300,
                feedrateMax: 1500,
                hertz: 10,
                overshoot: 1
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
        },
        webcam: {
            disabled: false,
            url: ''
        }
    }
};

let state;

try {
    let cnc = JSON.parse(localStorage.getItem('cnc')) || {};
    log.debug('cnc:', cnc);

    if (!(cnc.version)) {
        migrate();
    }

    state = _.merge({}, defaultState, cnc.state);
    
    { // Post-process the state after merging defaultState and cnc.state
        let defaultList = _.get(defaultState, 'workspace.container.default.widgets'); // use defaultState for the default container
        let primaryList = _.get(cnc.state, 'workspace.container.primary.widgets');
        let secondaryList = _.get(cnc.state, 'workspace.container.secondary.widgets');

        if (defaultList) {
            _.set(state, 'workspace.container.default.widgets', defaultList);
        }
        if (primaryList) {
            _.set(state, 'workspace.container.primary.widgets', primaryList);
        }
        if (secondaryList) {
            _.set(state, 'workspace.container.secondary.widgets', secondaryList);
        }
    }

    { // Remove duplicate ones
        let defaultList = _.get(state, 'workspace.container.default.widgets');
        let primaryList = _.get(state, 'workspace.container.primary.widgets');
        let secondaryList = _.get(state, 'workspace.container.secondary.widgets');

        primaryList = _(primaryList) // Keep the order of primaryList
            .uniq()
            .difference(defaultList) // exclude defaultList
            .value();

        secondaryList = _(secondaryList) // Keep the order of secondaryList
            .uniq()
            .difference(primaryList) // exclude primaryList
            .difference(defaultList) // exclude defaultList
            .value();

        _.set(state, 'workspace.container.primary.widgets', primaryList);
        _.set(state, 'workspace.container.secondary.widgets', secondaryList);
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
