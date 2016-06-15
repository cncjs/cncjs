import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import settings from '../config/settings';
import ImmutableStore from '../lib/immutable-store';
import log from '../lib/log';

let userData = null;

// Check if code is running in Electron renderer process
const isRenderer = (window && window.process && window.process.type === 'renderer');

if (isRenderer) {
    const electron = window.require('electron');
    const app = electron.remote.app;
    userData = {
        path: path.join(app.getPath('userData'), 'cnc.json')
    };
}

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
                feedrateMin: 500,
                feedrateMax: 2000,
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
            animation: true
        },
        webcam: {
            disabled: false,
            url: ''
        }
    }
};

const cnc = {};

try {
    let value;

    if (userData) {
        value = fs.readFileSync(userData.path, 'utf8');
    } else {
        value = localStorage.getItem('cnc');
    }

    let json = JSON.parse(value) || {};
    cnc.version = json.version;
    cnc.state = json.state;
} catch (err) {
    // Ignore errors
}

cnc.version = cnc.version || settings.version;
cnc.state = _.merge({}, defaultState, cnc.state || {});

log.debug('cnc:', cnc);

{ // Remove duplicate widgets
    let defaultList = _.get(defaultState, 'workspace.container.default.widgets');
    let primaryList = _.get(cnc.state, 'workspace.container.primary.widgets');
    let secondaryList = _.get(cnc.state, 'workspace.container.secondary.widgets');

    primaryList = _(primaryList) // Keep the order of primaryList
        .uniq()
        .difference(defaultList) // exclude defaultList
        .value();

    secondaryList = _(secondaryList) // Keep the order of secondaryList
        .uniq()
        .difference(primaryList) // exclude primaryList
        .difference(defaultList) // exclude defaultList
        .value();

    _.set(cnc.state, 'workspace.container.default.widgets', defaultList);
    _.set(cnc.state, 'workspace.container.primary.widgets', primaryList);
    _.set(cnc.state, 'workspace.container.secondary.widgets', secondaryList);
}

const store = new ImmutableStore(cnc.state);

store.on('change', (state) => {
    cnc.version = settings.version;
    cnc.state = state;

    const value = JSON.stringify(cnc, null, 4);

    if (userData) {
        fs.writeFileSync(userData.path, value);
    }

    localStorage.setItem('cnc', value);
});

export default store;
