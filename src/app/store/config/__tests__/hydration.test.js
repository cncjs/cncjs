import { hydrateConfig } from '../hydration';

jest.mock('@app/store/redux', () => ({
  __esModule: true,
  default: { dispatch: jest.fn() },
}));

jest.mock('@app/containers/app/actions', () => ({
  promptUserForCorruptedWorkspaceSettings: jest.fn(() => ({ type: 'CORRUPT' })),
}));

test('emits one change after successful normalization and migration', async () => {
  const events = [];
  const config = {
    state: { old: true },
    get: jest.fn(() => config.state),
    emit: jest.fn((event) => events.push(event)),
  };
  const normalize = jest.fn(() => ({ restored: true }));
  const migrate = jest.fn(() => events.push('migrate'));
  const onParsed = jest.fn();

  await expect(hydrateConfig({
    config,
    read: () => JSON.stringify({ version: '1.0.0', state: { old: false } }),
    onParsed,
    normalize,
    migrate,
  })).resolves.toBe(true);

  expect(config.state).toEqual({ restored: true });
  expect(onParsed).toHaveBeenCalledWith({ version: '1.0.0', state: { old: false } });
  expect(normalize).toHaveBeenCalledWith({ old: false });
  expect(migrate).toHaveBeenCalledTimes(1);
  expect(events).toEqual(['migrate', 'change']);
  expect(config.emit).toHaveBeenCalledWith('change', { restored: true });
});

test('does not emit or replace state when persisted config is corrupted', async () => {
  const config = {
    state: { keep: true },
    get: jest.fn(),
    emit: jest.fn(),
  };
  const onError = jest.fn();

  await expect(hydrateConfig({
    config,
    read: () => '{invalid',
    normalize: jest.fn(),
    migrate: jest.fn(),
    onError,
  })).resolves.toBe(false);

  expect(config.state).toEqual({ keep: true });
  expect(config.emit).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledTimes(1);
});

test('real config startup emits after localStorage hydration', async () => {
  localStorage.setItem('cnc', JSON.stringify({
    version: '999.0.0',
    state: { widgets: { axes: { minimized: true } } },
  }));

  let config;
  jest.isolateModules(() => {
    config = require('../index').default;
  });

  const changes = [];
  config.on('change', state => changes.push(state));
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });

  expect(changes).toHaveLength(1);
  expect(changes[0].widgets.axes.minimized).toBe(true);
  expect(config.get('workspace.container.primary.widgets')).toBeDefined();
});

test.each(['light', 'dark'])('preserves explicit %s appearance and language for the current prerelease', async appearance => {
  localStorage.setItem('cnc', JSON.stringify({
    version: '2.0.0-dev',
    state: { settings: { appearance, language: 'de' } },
  }));
  let config;
  jest.isolateModules(() => {
    config = require('../index').default;
  });
  await new Promise(resolve => {
    config.once('change', resolve);
  });

  expect(config.get('settings.appearance')).toBe(appearance);
  expect(config.get('settings.language')).toBe('de');
});
