import isElectron from 'is-electron';
import { ensureArray } from 'ensure-type';
import debounce from 'lodash/debounce';
import difference from 'lodash/difference';
import get from 'lodash/get';
import set from 'lodash/set';
import merge from 'lodash/merge';
import uniq from 'lodash/uniq';
import semver from 'semver';
import settings from '../config/settings';
import ImmutableStore from '../lib/immutable-store';
import log from '../lib/log';
import defaultState from './defaultState';

const cnc = {
  version: settings.version,
  state: {}
};

const store = new ImmutableStore(defaultState);

const getConfig = async () => {
  let content = '';

  // Check whether the code is running in Electron renderer process
  if (isElectron()) {
    const electron = window.require('electron');
    content = await electron.ipcRenderer.invoke('read-user-config');
  } else {
    content = localStorage.getItem('cnc') || '{}';
  }

  return content;
};

const persist = async (data) => {
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
      const electron = window.require('electron');
      await electron.ipcRenderer.invoke('write-user-config', value);
    } else {
      localStorage.setItem('cnc', value);
    }
  } catch (e) {
    log.error(e);
  }
};

const normalizeState = (state) => {
  //
  // Normalize workspace widgets
  //

  // Keep default widgets unchanged
  const defaultList = get(defaultState, 'workspace.container.default.widgets');
  set(state, 'workspace.container.default.widgets', defaultList);

  // Update primary widgets
  let primaryList = get(cnc.state, 'workspace.container.primary.widgets');
  if (primaryList) {
    set(state, 'workspace.container.primary.widgets', primaryList);
  } else {
    primaryList = get(state, 'workspace.container.primary.widgets');
  }

  // Update secondary widgets
  let secondaryList = get(cnc.state, 'workspace.container.secondary.widgets');
  if (secondaryList) {
    set(state, 'workspace.container.secondary.widgets', secondaryList);
  } else {
    secondaryList = get(state, 'workspace.container.secondary.widgets');
  }

  primaryList = uniq(ensureArray(primaryList)); // Use the same order in primaryList
  primaryList = difference(primaryList, defaultList); // Exclude defaultList

  secondaryList = uniq(ensureArray(secondaryList)); // Use the same order in secondaryList
  secondaryList = difference(secondaryList, primaryList); // Exclude primaryList
  secondaryList = difference(secondaryList, defaultList); // Exclude defaultList

  set(state, 'workspace.container.primary.widgets', primaryList);
  set(state, 'workspace.container.secondary.widgets', secondaryList);

  //
  // Remember configured axes (#416)
  //
  const configuredAxes = ensureArray(get(cnc.state, 'widgets.axes.axes'));
  const defaultAxes = ensureArray(get(defaultState, 'widgets.axes.axes'));
  if (configuredAxes.length > 0) {
    set(state, 'widgets.axes.axes', configuredAxes);
  } else {
    set(state, 'widgets.axes.axes', defaultAxes);
  }

  return state;
};

//
// Migration
//
const migrateStore = () => {
  if (!cnc.version) {
    return;
  }

  // 1.9.0
  // * Renamed "widgets.probe.tlo" to "widgets.probe.touchPlateHeight"
  // * Removed "widgets.webcam.scale"
  if (semver.lt(cnc.version, '1.9.0')) {
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
    // Axes widget
    store.unset('widgets.axes.wzero');
    store.unset('widgets.axes.mzero');
    store.unset('widgets.axes.jog.customDistance');
    store.unset('widgets.axes.jog.selectedDistance');
  }

  // 1.9.16
  // Removed "widgets.axes.wzero"
  // Removed "widgets.axes.mzero"
  // Removed "widgets.axes.jog.customDistance"
  // Removed "widgets.axes.jog.selectedDistance"
  if (semver.lt(cnc.version, '1.9.16')) {
    store.unset('widgets.axes.jog.step');
  }

  // 1.10.0
  // Changed the value of "widgets.webcam.mediaSource" from "mjpeg" to "stream"
  if (semver.lt(cnc.version, '1.10.0')) {
    const originalMediaSource = store.get('widgets.webcam.mediaSource');
    if (originalMediaSource === 'mjpeg') {
      store.set('widgets.webcam.mediaSource', 'stream');
    }
  }
};

(async () => {
  // Debouncing enforces that a function not be called again until a certain amount of time (e.g. 100ms) has passed without it being called.
  store.on('change', debounce(async (state) => {
    await persist({ state: state });
  }, 100));

  try {
    const text = await getConfig();
    const data = JSON.parse(text);
    cnc.version = get(data, 'version', settings.version);
    cnc.state = get(data, 'state', {});
  } catch (e) {
    set(settings, 'error.corruptedWorkspaceSettings', true);
    log.error(e);
  }

  store.state = normalizeState(merge({}, defaultState, cnc.state || {}));

  try {
    migrateStore();
  } catch (err) {
    log.error(err);
  }
})();

store.getConfig = getConfig;
store.persist = persist;

export default store;
