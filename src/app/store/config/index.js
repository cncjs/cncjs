import ensureArray from 'ensure-array';
import isElectron from 'is-electron';
import _debounce from 'lodash/debounce';
import _difference from 'lodash/difference';
import _get from 'lodash/get';
import _set from 'lodash/set';
import _merge from 'lodash/merge';
import _uniq from 'lodash/uniq';
import semver from 'semver';
import settings from 'app/config/settings';
import log from 'app/lib/log';
import reduxStore from 'app/store/redux';
import { promptUserForCorruptedWorkspaceSettings } from 'app/containers/App/actions';
import EventEmitterStore from './EventEmitterStore';
import defaultState from './defaultState';

const config = new EventEmitterStore(defaultState);

let userData = null;

// Check whether the code is running in Electron renderer process
if (isElectron()) {
    const electron = window.require('electron');
    const path = window.require('path'); // Require the path module within Electron
    const app = electron.remote.app;
    userData = {
        path: path.join(app.getPath('userData'), 'cnc.json')
    };
}

config.toJSONString = () => {
    let content = '';

    // Check whether the code is running in Electron renderer process
    if (isElectron()) {
        const fs = window.require('fs'); // Require the fs module within Electron
        if (fs.existsSync(userData.path)) {
            content = fs.readFileSync(userData.path, 'utf8') || '{}';
        }
    } else {
        content = localStorage.getItem('cnc') || '{}';
    }

    return content;
};

config.getDefaultState = () => defaultState;

config.persist = (data) => {
    const { version, state } = { ...data };

    data = {
        version: version || settings.version,
        state: {
            ...config.state,
            ...state
        }
    };

    try {
        const value = JSON.stringify(data, null, 2);

        // Check whether the code is running in Electron renderer process
        if (isElectron()) {
            const fs = window.require('fs'); // Use window.require to require fs module in Electron
            fs.writeFileSync(userData.path, value);
        } else {
            localStorage.setItem('cnc', value);
        }
    } catch (e) {
        log.error(e);
    }
};

config.restoreDefault = () => {
    config.state = { ...defaultState };
};

const normalizeState = (state) => {
    { // Update workspace widgets
        // Keep default widgets unchanged
        const defaultList = _get(defaultState, 'workspace.container.default.widgets');
        _set(state, 'workspace.container.default.widgets', defaultList);

        // Update primary widgets
        let primaryList = _get(cnc.state, 'workspace.container.primary.widgets');
        if (primaryList) {
            _set(state, 'workspace.container.primary.widgets', primaryList);
        } else {
            primaryList = _get(state, 'workspace.container.primary.widgets');
        }

        // Update secondary widgets
        let secondaryList = _get(cnc.state, 'workspace.container.secondary.widgets');
        if (secondaryList) {
            _set(state, 'workspace.container.secondary.widgets', secondaryList);
        } else {
            secondaryList = _get(state, 'workspace.container.secondary.widgets');
        }

        primaryList = _uniq(ensureArray(primaryList)); // Use the same order in primaryList
        primaryList = _difference(primaryList, defaultList); // Exclude defaultList

        secondaryList = _uniq(ensureArray(secondaryList)); // Use the same order in secondaryList
        secondaryList = _difference(secondaryList, primaryList); // Exclude primaryList
        secondaryList = _difference(secondaryList, defaultList); // Exclude defaultList

        _set(state, 'workspace.container.primary.widgets', primaryList);
        _set(state, 'workspace.container.secondary.widgets', secondaryList);
    }

    { // Remember configured axes (#416)
        const configuredAxes = ensureArray(_get(cnc.state, 'widgets.axes.axes'));
        const defaultAxes = ensureArray(_get(defaultState, 'widgets.axes.axes'));
        if (configuredAxes.length > 0) {
            _set(state, 'widgets.axes.axes', configuredAxes);
        } else {
            _set(state, 'widgets.axes.axes', defaultAxes);
        }
    }

    return state;
};

const cnc = {
    error: false,
    version: settings.version,
    state: {}
};

try {
    const text = config.toJSONString();
    const data = JSON.parse(text);
    cnc.version = _get(data, 'version', settings.version);
    cnc.state = _get(data, 'state', {});
} catch (e) {
    log.error(e);

    cnc.error = true;

    // Dispatch an action to prompt user for corrupted workspace settings
    reduxStore.dispatch(promptUserForCorruptedWorkspaceSettings());
}

config.state = normalizeState(_merge({}, defaultState, cnc.state || {}));

// Debouncing enforces that a function not be called again until a certain amount of time (e.g. 100ms) has passed without it being called.
config.on('change', _debounce((state) => {
    config.persist({ state: state });
}, 100));

//
// Migration
//
const migrateStore = () => {
    if (cnc.error) {
        // Probably due to corrupted workspace settings
        return;
    }

    if (!cnc.version) {
        return;
    }

    // 1.9.0
    // * Renamed "widgets.probe.tlo" to "widgets.probe.touchPlateHeight"
    // * Removed "widgets.webcam.scale"
    if (semver.lt(cnc.version, '1.9.0')) {
        log.info(`Migrate config from v${cnc.version} to v1.9.0`);
        // Probe widget
        const tlo = config.get('widgets.probe.tlo');
        if (tlo !== undefined) {
            config.set('widgets.probe.touchPlateHeight', Number(tlo));
            config.unset('widgets.probe.tlo');
        }

        // Webcam widget
        config.unset('widgets.webcam.scale');
    }

    // 1.9.13
    // Removed "widgets.axes.wzero"
    // Removed "widgets.axes.mzero"
    // Removed "widgets.axes.jog.customDistance"
    // Removed "widgets.axes.jog.selectedDistance"
    if (semver.lt(cnc.version, '1.9.13')) {
        log.info(`Migrate config from v${cnc.version} to v1.9.13`);
        // Axes widget
        config.unset('widgets.axes.wzero');
        config.unset('widgets.axes.mzero');
        config.unset('widgets.axes.jog.customDistance');
        config.unset('widgets.axes.jog.selectedDistance');
    }

    // 1.9.16
    // Removed "widgets.axes.jog.step"
    if (semver.lt(cnc.version, '1.9.16')) {
        log.info(`Migrate config from v${cnc.version} to v1.9.16`);
        config.unset('widgets.axes.jog.step');
    }

    // 1.10.0
    // Removed "widgets.connection.port"
    // Removed "widgets.connection.baudrate"
    if (semver.lt(cnc.version, '1.10.0')) {
        log.info(`Migrate config from v${cnc.version} to v1.10.0`);
        config.unset('widgets.connection.port');
        config.unset('widgets.connection.baudrate');
    }
};

try {
    migrateStore();
} catch (err) {
    log.error(err);
}

export default config;
