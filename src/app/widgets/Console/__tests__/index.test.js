/* eslint-env jest */
jest.mock('app/config/settings', () => ({}));
jest.mock('app/components/Space', () => () => null);
jest.mock('app/components/Widget', () => () => null);
jest.mock('app/lib/chalk', () => ({ white: text => text, yellow: text => text, blackBright: text => text }));
jest.mock('app/lib/controller', () => ({ port: '' }));
jest.mock('app/lib/i18n', () => ({ _: text => text }));
jest.mock('app/lib/portal', () => jest.fn());
jest.mock('../../WidgetConfig', () => class { get(key, fallback) { return fallback; } set() {} });
jest.mock('../Console', () => () => null);
jest.mock('../Settings', () => () => null);
jest.mock('../index.styl', () => ({}));

const ConsoleWidget = require('../index').default;

describe('Console widget echo', () => {
  const echoed = (context, data = 'G0 X1') => {
    const widget = new ConsoleWidget({ widgetId: 'console', onFork: jest.fn(), onRemove: jest.fn() });
    widget.terminal = { prompt: '> ', writeln: jest.fn() };
    widget.controllerEvents['serialport:write'](data, context);
    return widget.terminal.writeln.mock.calls.length;
  };

  test('echoes a command that has no context or no echo flag', () => {
    expect(echoed(undefined)).toBe(1);
    expect(echoed({ source: 'feeder>' })).toBe(1);
  });

  test('echoes when echo is true', () => {
    expect(echoed({ echo: true })).toBe(1);
  });

  test('does not echo when echo is false', () => {
    expect(echoed({ echo: false })).toBe(0);
    expect(echoed({ echo: false, source: 'feeder>' })).toBe(0);
  });

  test('only the boolean false suppresses the echo', () => {
    [0, '', null, undefined].forEach(echo => {
      expect(echoed({ echo })).toBe(1);
    });
  });
});
