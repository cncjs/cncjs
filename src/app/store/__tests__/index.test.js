/* eslint-env jest */

const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
const config = JSON.stringify({ state: { workspace: { container: { primary: { show: false } } } } });

const loadStore = async () => {
  let store;
  jest.isolateModules(() => {
    store = require('..').default;
  });
  await new Promise(resolve => {
    setImmediate(resolve);
  });
  return store;
};

beforeEach(() => {
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: { userAgent: 'Mozilla/5.0 Electron/22.0.3' }
  });
  global.window = {};
  global.localStorage = {
    getItem: jest.fn().mockReturnValue(config),
    setItem: jest.fn()
  };
});

afterEach(() => {
  delete global.window;
  delete global.localStorage;
  if (originalNavigator) {
    Object.defineProperty(global, 'navigator', originalNavigator);
  } else {
    delete global.navigator;
  }
});

test('loads and saves browser settings when an Electron user agent has no Node access', async () => {
  const store = await loadStore();
  expect(store.get('workspace.container.primary.show')).toBe(false);

  await store.persist({});
  expect(localStorage.getItem).toHaveBeenCalledWith('cnc');
  const [[key, saved]] = localStorage.setItem.mock.calls;
  expect(key).toBe('cnc');
  expect(JSON.parse(saved).state.workspace.container.primary.show).toBe(false);
});

test('loads and saves desktop settings through Electron IPC', async () => {
  const invoke = jest.fn().mockResolvedValue(config);
  window.process = { type: 'renderer' };
  window.require = () => ({ ipcRenderer: { invoke } });
  const store = await loadStore();
  expect(store.get('workspace.container.primary.show')).toBe(false);

  await store.persist({});
  expect(invoke).toHaveBeenCalledWith('read-user-config');
  const [channel, saved] = invoke.mock.lastCall;
  expect(channel).toBe('write-user-config');
  expect(JSON.parse(saved).state.workspace.container.primary.show).toBe(false);
  expect(localStorage.getItem).not.toHaveBeenCalled();
  expect(localStorage.setItem).not.toHaveBeenCalled();
});
