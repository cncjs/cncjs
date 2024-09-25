import { ensureArray, ensureFiniteNumber } from 'ensure-type';
import isElectron from 'is-electron';
import _debounce from 'lodash/debounce';
import _difference from 'lodash/difference';
import _get from 'lodash/get';
import _set from 'lodash/set';
import _merge from 'lodash/merge';
import _uniq from 'lodash/uniq';
import semverLt from 'semver/functions/lt';
import semverLte from 'semver/functions/lte';
import settings from '@app/config/settings';
import { parse as parseCookie } from '@app/lib/cookie-parser';
import log from '@app/lib/log';
import reduxStore from '@app/store/redux';
import { promptUserForCorruptedWorkspaceSettings } from '@app/containers/App/actions';
import EventEmitterStore from './EventEmitterStore';
import defaultState from './defaultState';

const cnc = {
  version: settings.version,
  state: {},
};

const config = new EventEmitterStore(defaultState);

config.toJSONString = async () => {
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

config.getDefaultState = () => defaultState;

config.persist = async (data) => {
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
      const electron = window.require('electron');
      await electron.ipcRenderer.invoke('write-user-config', value);
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

// Debouncing enforces that a function not be called again until a certain amount of time (e.g. 100ms) has passed without it being called.
config.on('change', _debounce(async (state) => {
  await config.persist({ state: state });
}, 100));

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

//
// Migration
//
const migrateStore = () => {
  // 1.9.0
  // * Renamed "widgets.probe.tlo" to "widgets.probe.touchPlateHeight"
  // * Removed "widgets.webcam.scale"
  if (semverLt(cnc.version, '1.9.0')) {
    log.info(`Migrating configuration settings from v${cnc.version} to v1.9.0`);
    // Probe widget
    const tlo = config.get('widgets.probe.tlo');
    if (tlo !== undefined) {
      config.set('widgets.probe.touchPlateHeight', ensureFiniteNumber(tlo));
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
  if (semverLt(cnc.version, '1.9.13')) {
    log.info(`Migrating configuration settings from v${cnc.version} to v1.9.13`);
    // Axes widget
    config.unset('widgets.axes.wzero');
    config.unset('widgets.axes.mzero');
    config.unset('widgets.axes.jog.customDistance');
    config.unset('widgets.axes.jog.selectedDistance');
  }

  // 1.9.16
  // Removed "widgets.axes.jog.step"
  if (semverLt(cnc.version, '1.9.16')) {
    log.info(`Migrating configration settings from v${cnc.version} to v1.9.16`);
    config.unset('widgets.axes.jog.step');
  }

  // 1.10.0
  // Changed the value of "widgets.webcam.mediaSource" from "mjpeg" to "stream"
  if (semverLt(cnc.version, '1.10.0')) {
    const originalMediaSource = config.get('widgets.webcam.mediaSource');
    if (originalMediaSource === 'mjpeg') {
      config.set('widgets.webcam.mediaSource', 'stream');
    }
  }

  // 2.0.0
  // Removed "widgets.connection.port"
  // Removed "widgets.connection.baudrate"
  if (semverLte(cnc.version, '2.0.0')) {
    config.unset('widgets.connection.port');
    config.unset('widgets.connection.baudrate');
  }

  if (semverLt(cnc.version, '2.0.0')) {
    log.info(`Migrating configuration settings from v${cnc.version} to v2.0.0`);

    // appearance
    config.set('settings.appearance', _get(defaultState, 'settings.appearance'));

    // language
    const cookie = parseCookie(document?.cookie ?? '');
    const language = cookie?.lang ?? _get(defaultState, 'settings.language');
    config.set('settings.language', language);
  }
};

(async () => {
  let canMigrateStore = false;

  try {
    const content = await config.toJSONString();
    const { version, state } = JSON.parse(content);
    cnc.version = version;
    cnc.state = state;

    config.state = normalizeState(_merge({}, defaultState, cnc.state ?? {}));

    if (!!cnc.version) {
      canMigrateStore = true;
    }
  } catch (e) {
    log.error(e);

    // Dispatch an action to prompt user for corrupted workspace settings
    reduxStore.dispatch(promptUserForCorruptedWorkspaceSettings());
  }

  if (canMigrateStore) {
    migrateStore();
  }
})();

export default config;
