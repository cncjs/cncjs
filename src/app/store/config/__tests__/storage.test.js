import reduxStore from '@app/store/redux';
import log from '@app/lib/log';

jest.mock('@app/store/redux', () => ({
  __esModule: true,
  default: { dispatch: jest.fn() },
}));
jest.mock('@app/containers/app/actions', () => ({
  promptUserForCorruptedWorkspaceSettings: () => ({ type: 'CORRUPT' }),
}));
jest.mock('@app/lib/log', () => ({
  trace: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const savedConfig = {
  version: '2.0.0-dev',
  state: {
    settings: { appearance: 'dark', language: 'de' },
    widgets: { axes: { minimized: true } },
  },
};
const originalRequire = Object.getOwnPropertyDescriptor(window, 'require');

const loadConfig = async () => {
  let config;
  jest.isolateModules(() => {
    config = require('../index').default;
  });
  await jest.advanceTimersByTimeAsync(0);
  return config;
};

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (originalRequire) {
    Object.defineProperty(window, 'require', originalRequire);
  } else {
    delete window.require;
  }
});

test.each([
  ['ordinary browser', 'Mozilla/5.0', undefined],
  ['browser with a require function', 'Mozilla/5.0', () => {}],
  ['Electron user agent without require', 'Mozilla/5.0 Electron/22.0.3', undefined],
  ['Electron user agent with non-callable require', 'Mozilla/5.0 Electron/22.0.3', {}],
])('%s hydrates and persists browser settings across reload', async (_name, userAgent, requireValue) => {
  jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  window.require = requireValue;
  localStorage.setItem('cnc', JSON.stringify(savedConfig));

  const config = await loadConfig();
  expect(config.get('settings')).toEqual(savedConfig.state.settings);
  expect(config.get('widgets.axes.minimized')).toBe(true);
  expect(reduxStore.dispatch).not.toHaveBeenCalled();

  config.set('settings.appearance', 'light');
  await jest.advanceTimersByTimeAsync(100);
  const stored = JSON.parse(localStorage.getItem('cnc'));
  expect(stored.version).toBe(savedConfig.version);
  expect(stored.state.settings).toEqual({ appearance: 'light', language: 'de' });
  expect(stored.state.widgets.axes.minimized).toBe(true);

  const reloadedConfig = await loadConfig();
  expect(reloadedConfig.get('settings.appearance')).toBe('light');
  expect(reloadedConfig.get('settings.language')).toBe('de');
  expect(reloadedConfig.get('widgets.axes.minimized')).toBe(true);
});

test('Electron IPC waits for hydration before persisting and remains the read/write backend', async () => {
  jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Electron/22.0.3');
  let resolveRead;
  const read = new Promise(resolve => {
    resolveRead = resolve;
  });
  const invoke = jest.fn(channel => (channel === 'read-user-config' ? read : Promise.resolve()));
  window.require = jest.fn(() => ({ ipcRenderer: { invoke } }));
  const getItem = jest.spyOn(Storage.prototype, 'getItem');
  const setItem = jest.spyOn(Storage.prototype, 'setItem');

  const config = await loadConfig();
  await jest.advanceTimersByTimeAsync(200);
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith('read-user-config');

  resolveRead(JSON.stringify(savedConfig));
  await jest.advanceTimersByTimeAsync(0);
  expect(config.get('settings')).toEqual(savedConfig.state.settings);
  expect(config.get('widgets.axes.minimized')).toBe(true);
  await jest.advanceTimersByTimeAsync(100);
  expect(window.require).toHaveBeenCalledWith('electron');
  expect(invoke).toHaveBeenLastCalledWith('write-user-config', expect.any(String));
  const stored = JSON.parse(invoke.mock.calls[1][1]);
  expect(stored.version).toBe(savedConfig.version);
  expect(stored.state.settings).toEqual(savedConfig.state.settings);
  expect(stored.state.widgets.axes.minimized).toBe(true);
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});

test('browser storage errors retain corrupted-settings reporting and logged write failures', async () => {
  jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Electron/22.0.3');
  delete window.require;
  const error = new Error('browser storage unavailable');
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw error;
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw error;
  });

  const config = await loadConfig();
  expect(reduxStore.dispatch).toHaveBeenCalledWith({ type: 'CORRUPT' });
  await expect(config.toJSONString()).rejects.toBe(error);
  await expect(config.persist()).resolves.toBeUndefined();
  expect(log.error).toHaveBeenCalledWith(error);
});

test('genuine IPC failures retain existing error behavior without writing browser storage', async () => {
  jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Electron/22.0.3');
  const error = new Error('IPC unavailable');
  const invoke = jest.fn().mockRejectedValue(error);
  window.require = jest.fn(() => ({ ipcRenderer: { invoke } }));
  const getItem = jest.spyOn(Storage.prototype, 'getItem');
  const setItem = jest.spyOn(Storage.prototype, 'setItem');

  const config = await loadConfig();
  expect(reduxStore.dispatch).toHaveBeenCalledWith({ type: 'CORRUPT' });
  await expect(config.toJSONString()).rejects.toBe(error);
  await expect(config.persist()).resolves.toBeUndefined();
  expect(invoke).toHaveBeenCalledWith('write-user-config', expect.any(String));
  expect(log.error).toHaveBeenCalledWith(error);
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});
