/* eslint-env jest */
jest.mock('app/config/settings', () => ({}));
jest.mock('app/components/Space', () => () => null);
jest.mock('app/components/Widget', () => () => null);
jest.mock('app/lib/chalk', () => ({ white: text => text, yellow: text => text, blackBright: text => text }));
jest.mock('app/lib/controller', () => ({ port: '' }));
jest.mock('app/lib/i18n', () => ({ _: text => text }));
jest.mock('app/lib/portal', () => jest.fn());
jest.mock('../../WidgetConfig', () => class {
  get(key, fallback) {
    return fallback;
  } set() {}
});
jest.mock('../Console', () => () => null);
jest.mock('../Settings', () => () => null);
jest.mock('../index.styl', () => ({}));

const ConsoleWidget = require('../index').default;

// A widget with a fake terminal, and helpers that feed it the controller's events
const setup = () => {
  const widget = new ConsoleWidget({ widgetId: 'console', onFork: jest.fn(), onRemove: jest.fn() });
  widget.terminal = { prompt: '> ', writeln: jest.fn(), clear: jest.fn() };
  widget.setState = jest.fn();
  const events = widget.controllerEvents;
  return {
    widget,
    lines: () => widget.terminal.writeln.mock.calls.map(([text]) => text),
    write: (data, context) => events['serialport:write'](data, context),
    read: (data) => events['serialport:read'](data),
    close: () => events['serialport:close']({ port: '/dev/ttyUSB0' })
  };
};

describe('Console widget echo', () => {
  const echoed = (context) => {
    const { write, lines } = setup();
    write('G0 X1\n', context);
    return lines().length;
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

describe('Console widget replies to commands sent with echo: false', () => {
  const HIDDEN = { echo: false, source: 'feeder>' };
  const SHOWN = { source: 'feeder>' };

  afterEach(() => jest.restoreAllMocks());

  test('hides the ok of a hidden command and shows the ok of a normal one', () => {
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    read('ok');
    expect(lines()).toEqual([]);
    write('G0 X1\n', SHOWN);
    read('ok');
    expect(lines()).toEqual(['feeder>> G0 X1', 'ok']);
  });

  test('hides an ok that is followed by text, such as Marlin\'s', () => {
    const { write, read, lines } = setup();
    write('M105\n', HIDDEN);
    read('ok T:25.0 /0.0 B:24.5 /0.0 @:0 B@:0');
    expect(lines()).toEqual([]);
  });

  test('does not take other text that starts with "ok" for a reply', () => {
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    read('okapi');
    read('ok');
    expect(lines()).toEqual(['okapi']);
  });

  test('matches replies to commands in the order they were sent', () => {
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    write('G0 X1\n', SHOWN);
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    read('ok');
    read('ok');
    read('ok');
    expect(lines()).toEqual(['feeder>> G0 X1', 'ok']);
  });

  test('never hides an error', () => {
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    write('G0 X1\n', SHOWN);
    read('error:9');
    read('ok');
    expect(lines()).toEqual(['feeder>> G0 X1', 'error:9', 'ok']);
  });

  test('counts the reply to a command typed in the Console itself', () => {
    const { widget, write, read, lines } = setup();
    write('G0 X1\n', { __sender__: widget.senderId }); // typed here: not echoed again, its ok is shown
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    read('ok'); // the reply to the typed command
    expect(lines()).toEqual(['ok']);
    read('ok'); // the reply to the hidden one
    expect(lines()).toEqual(['ok']);
  });

  test('counts every line of a multi-line write', () => {
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n$J=G21G91X0.1F2000\n', HIDDEN);
    read('ok');
    read('ok');
    read('ok');
    expect(lines()).toEqual(['ok']);
  });

  test('does not expect a reply to a realtime command', () => {
    const { write, read, lines } = setup();
    write('?', SHOWN);
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    read('<Idle|MPos:0.000,0.000,0.000>');
    read('ok');
    expect(lines()).toEqual(['feeder>> ?', '<Idle|MPos:0.000,0.000,0.000>']);
  });

  test('forgets unanswered commands after a soft reset', () => {
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    write('\x18', { echo: false });
    write('G0 X1\n', SHOWN);
    read('ok');
    expect(lines()).toEqual(['feeder>> G0 X1', 'ok']);
  });

  test('forgets unanswered commands at the controller startup message', () => {
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    read('Grbl 1.1h [\'$\' for help]');
    write('G0 X1\n', SHOWN);
    read('ok');
    expect(lines()).toEqual(['Grbl 1.1h [\'$\' for help]', 'feeder>> G0 X1', 'ok']);
  });

  test('forgets unanswered commands when the port is closed', () => {
    const { write, read, close, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    close();
    write('G0 X1\n', SHOWN);
    read('ok');
    expect(lines()).toEqual(['feeder>> G0 X1', 'ok']);
  });

  test('stops waiting for a reply that never comes', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const { write, read, lines } = setup();
    write('$J=G21G91X0.1F2000\n', HIDDEN);
    now.mockReturnValue(1000 + 6000);
    write('G0 X1\n', SHOWN);
    read('ok');
    expect(lines()).toEqual(['feeder>> G0 X1', 'ok']);
  });
});
