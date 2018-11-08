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
import reduxStore from 'app/store/redux-store';
import defaultState from 'app/store/defaultState';
import EventEmitterStore from 'app/store/EventEmitterStore';
import { promptUserForCorruptedWorkspaceSettings } from 'app/containers/App/actions';

const store = new EventEmitterStore(defaultState);

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

const getConfig = () => {
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

const persist = (data) => {
    const { version, state } = { ...data };

    data = {
        version: version || settings.version,
        state: {
            ...store.state,
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

const normalizeState = (state) => {
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

    return state;
};

const cnc = {
    error: false,
    version: settings.version,
    state: {}
};

try {
    const text = getConfig();
    const data = JSON.parse(text);
    cnc.version = _get(data, 'version', settings.version);
    cnc.state = _get(data, 'state', {});
} catch (e) {
    log.error(e);

    cnc.error = true;

    // Dispatch an action to prompt user for corrupted workspace settings
    reduxStore.dispatch(promptUserForCorruptedWorkspaceSettings());
}

store.state = normalizeState(_merge({}, defaultState, cnc.state || {}));

// Debouncing enforces that a function not be called again until a certain amount of time (e.g. 100ms) has passed without it being called.
store.on('change', _debounce((state) => {
    persist({ state: state });
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
        log.info(`Migrate store from v${cnc.version} to v1.9.0`);
        // Probe widget
        const tlo = store.get('widgets.probe.tlo');
        if (tlo !== undefined) {
            store.set('widgets.probe.touchPlateHeight', Number(tlo));
            store.unset('widgets.probe.tlo');
        }

        // Webcam widget
        store.unset('widgets.webcam.scale');
    }

    // 1.9.13
    // Removed "widgets.axes.wzero"
    // Removed "widgets.axes.mzero"
    // Removed "widgets.axes.jog.customDistance"
    // Removed "widgets.axes.jog.selectedDistance"
    if (semver.lt(cnc.version, '1.9.13')) {
        log.info(`Migrate store from v${cnc.version} to v1.9.13`);
        // Axes widget
        store.unset('widgets.axes.wzero');
        store.unset('widgets.axes.mzero');
        store.unset('widgets.axes.jog.customDistance');
        store.unset('widgets.axes.jog.selectedDistance');
    }

    // 1.9.16
    // Removed "widgets.axes.jog.step"
    if (semver.lt(cnc.version, '1.9.16')) {
        log.info(`Migrate store from v${cnc.version} to v1.9.16`);
        store.unset('widgets.axes.jog.step');
    }
};

try {
    migrateStore();
} catch (err) {
    log.error(err);
}

store.getConfig = getConfig;
store.persist = persist;

export default store;
