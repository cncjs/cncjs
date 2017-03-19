import isElectron from 'is-electron';
import path from 'path';
import _ from 'lodash';
import settings from '../config/settings';
import ImmutableStore from '../lib/immutable-store';
import log from '../lib/log';

let userData = null;

// Check if code is running in Electron renderer process
if (isElectron()) {
    const electron = window.require('electron');
    const app = electron.remote.app;
    userData = {
        path: path.join(app.getPath('userData'), 'cnc.json')
    };
}

// Also see "containers/Workspace/WidgetManager/index.jsx"
export const defaultState = {
    session: {
        name: '',
        token: ''
    },
    workspace: {
        container: {
            default: {
                widgets: ['visualizer']
            },
            primary: {
                show: true,
                widgets: [
                    'connection', 'console', 'grbl', 'smoothie', 'tinyg', 'webcam'
                ]
            },
            secondary: {
                show: true,
                widgets: [
                    'axes', 'gcode', 'macro', 'probe', 'spindle', 'laser'
                ]
            }
        }
    },
    widgets: {
        axes: {
            minimized: false,
            axes: ['x', 'y', 'z'],
            jog: {
                keypad: false,
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
            minimized: false,
            controller: {
                type: 'Grbl' // Grbl|Smoothie|TinyG
            },
            port: '',
            baudrate: 115200,
            autoReconnect: true
        },
        console: {
            minimized: false
        },
        gcode: {
            minimized: false
        },
        grbl: {
            minimized: false,
            panel: {
                queueReports: {
                    expanded: true
                },
                statusReports: {
                    expanded: true
                },
                modalGroups: {
                    expanded: true
                }
            }
        },
        laser: {
            minimized: false,
            panel: {
                laserTest: {
                    expanded: true
                }
            },
            test: {
                power: 0,
                duration: 0
            }
        },
        macro: {
            minimized: false
        },
        probe: {
            minimized: false,
            probeCommand: 'G38.2',
            probeDepth: 10,
            probeFeedrate: 20,
            tlo: 10,
            retractionDistance: 4
        },
        smoothie: {
            minimized: false,
            panel: {
                statusReports: {
                    expanded: true
                },
                modalGroups: {
                    expanded: true
                }
            }
        },
        spindle: {
            minimized: false,
            speed: 1000
        },
        tinyg: {
            minimized: false,
            panel: {
                queueReports: {
                    expanded: true
                },
                statusReports: {
                    expanded: true
                },
                modalGroups: {
                    expanded: true
                }
            }
        },
        visualizer: {
            minimized: false,

            // 3D View
            disabled: false,
            projection: 'orthographic', // 'perspective' or 'orthographic'
            cameraMode: 'pan', // 'pan' or 'rotate'
            gcode: {
                displayName: true
            },
            objects: {
                coordinateSystem: {
                    visible: true
                },
                toolhead: {
                    visible: true
                }
            }
        },
        webcam: {
            minimized: false,
            disabled: true,

            // local - Use a built-in camera or a connected webcam
            // mjpeg - M-JPEG stream over HTTP
            mediaSource: 'local',

            // The URL field is required for the M-JPEG stream
            url: '',

            centerFocus: false,
            geometry: {
                flipHorizontally: false,
                flipVertically: false,
                scale: 1.0
            }
        }
    }
};

const normalizeState = (state) => {
    // Keep default widgets unchanged
    const defaultList = _.get(defaultState, 'workspace.container.default.widgets');
    _.set(state, 'workspace.container.default.widgets', defaultList);

    // Update primary widgets
    let primaryList = _.get(cnc.state, 'workspace.container.primary.widgets');
    if (primaryList) {
        _.set(state, 'workspace.container.primary.widgets', primaryList);
    } else {
        primaryList = _.get(state, 'workspace.container.primary.widgets');
    }

    // Update secondary widgets
    let secondaryList = _.get(cnc.state, 'workspace.container.secondary.widgets');
    if (secondaryList) {
        _.set(state, 'workspace.container.secondary.widgets', secondaryList);
    } else {
        secondaryList = _.get(state, 'workspace.container.secondary.widgets');
    }

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

    return state;
};

const getUserConfig = () => {
    const cnc = {};

    try {
        let value;

        if (userData) {
            const fs = window.require('fs'); // Use window.require to require fs module in Electron
            value = fs.readFileSync(userData.path, 'utf8');
        } else {
            value = localStorage.getItem('cnc');
        }

        let json = JSON.parse(value) || {};
        cnc.version = json.version;
        cnc.state = json.state;
    } catch (err) {
        log.error(err);
    }

    return cnc;
};

const cnc = getUserConfig();
const state = normalizeState(_.merge({}, defaultState, cnc.state || {}));
const store = new ImmutableStore(state);

store.on('change', (state) => {
    try {
        const value = JSON.stringify({
            version: settings.version,
            state: state
        }, null, 4);

        if (userData) {
            const fs = window.require('fs'); // Use window.require to require fs module in Electron
            fs.writeFile(userData.path, value);
        }

        localStorage.setItem('cnc', value);
    } catch (err) {
        log.error(err);
    }
});

export default store;
