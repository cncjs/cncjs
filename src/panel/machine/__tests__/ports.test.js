import controller from '../controller';
import {
  readPorts,
  baudrateChoices,
  controllerChoices,
  requestPorts,
  openPort,
  closePort,
  DEFAULT_BAUDRATE,
  DEFAULT_CONTROLLER,
  PORT_OPEN,
  PORT_BUSY,
  PORT_FREE,
} from '../ports';

jest.mock('../controller', () => ({
  listPorts: jest.fn(),
  openPort: jest.fn(),
  closePort: jest.fn(),
}));

describe('readPorts', () => {
  test('tells the port this panel holds from one somebody else holds', () => {
    // Both are `inuse` as far as the server is concerned. Only one of them is
    // this panel's, and only that one may be offered a Disconnect.
    const rows = readPorts([
      { port: 'COM3', manufacturer: 'Arduino LLC', inuse: true },
      { port: 'COM4', manufacturer: 'FTDI', inuse: true },
      { port: 'COM5', manufacturer: '', inuse: false },
    ], 'COM3');

    expect(rows.map((row) => row.state)).toEqual([PORT_OPEN, PORT_BUSY, PORT_FREE]);
  });

  test('holds nothing when the panel is attached to nothing', () => {
    const rows = readPorts([{ port: 'COM3', inuse: true }], '');
    expect(rows[0].state).toBe(PORT_BUSY);
  });

  test('sorts by name, so a refresh does not move a row under a finger', () => {
    // The server concatenates `config.get('ports')` onto the driver's list, so
    // what arrives is in no order at all.
    const rows = readPorts([
      { port: 'COM10' },
      { port: 'COM3' },
      { port: '/dev/ttyUSB0' },
    ]);
    expect(rows.map((row) => row.port)).toEqual(['/dev/ttyUSB0', 'COM10', 'COM3']);
  });

  test('drops a row with no port, which is a row nothing can open', () => {
    expect(readPorts([{ manufacturer: 'FTDI' }, null, { port: 'COM3' }]))
      .toHaveLength(1);
  });

  test('survives a server that has not answered yet', () => {
    expect(readPorts(undefined)).toEqual([]);
    expect(readPorts(null)).toEqual([]);
  });

  test('carries the manufacturer, and an absence of one as an empty string', () => {
    const [named, bare] = readPorts([
      { port: 'COM3', manufacturer: 'Arduino LLC' },
      { port: 'COM4' },
    ]);
    expect(named.manufacturer).toBe('Arduino LLC');
    expect(bare.manufacturer).toBe('');
  });
});

describe('baudrateChoices', () => {
  test('offers the common rates largest first', () => {
    expect(baudrateChoices()).toEqual([250000, 115200, 57600, 38400, 19200, 9600]);
  });

  test('merges what this installation configured, without repeating it', () => {
    expect(baudrateChoices([76800, 115200])).toEqual(
      [250000, 115200, 76800, 57600, 38400, 19200, 9600],
    );
  });

  test('ignores a configured rate that is not a number', () => {
    // `.cncrc` is hand-edited and its `baudrates` is whatever was typed.
    expect(baudrateChoices(['', null, 'fast'])).toEqual(baudrateChoices());
  });
});

describe('controllerChoices', () => {
  test('offers what the server says it loaded', () => {
    expect(controllerChoices(['Grbl', 'Marlin'])).toEqual(['Grbl', 'Marlin']);
  });

  test('falls back rather than offering an empty choice', () => {
    // Before `startup` arrives the client's list is empty, and a screen with
    // no controller to pick cannot be connected from at all.
    expect(controllerChoices([])).toEqual([DEFAULT_CONTROLLER]);
    expect(controllerChoices()).toEqual([DEFAULT_CONTROLLER]);
  });
});

describe('the three calls that reach the server', () => {
  beforeEach(() => {
    controller.listPorts.mockClear();
    controller.openPort.mockClear();
    controller.closePort.mockClear();
  });

  test('asking for the list takes no callback, because the answer is an event', () => {
    requestPorts();
    expect(controller.listPorts).toHaveBeenCalledTimes(1);
  });

  test('opening defaults to Grbl at 115200 and lets both be overridden', async () => {
    controller.openPort.mockImplementation((port, options, done) => done(null));

    await openPort('COM3');
    expect(controller.openPort).toHaveBeenCalledWith(
      'COM3',
      { controllerType: DEFAULT_CONTROLLER, baudrate: DEFAULT_BAUDRATE },
      expect.any(Function),
    );

    await openPort('COM4', { controllerType: 'Marlin', baudrate: 250000 });
    expect(controller.openPort).toHaveBeenLastCalledWith(
      'COM4',
      { controllerType: 'Marlin', baudrate: 250000 },
      expect.any(Function),
    );
  });

  test('a refusal rejects, even though it arrives empty', async () => {
    // socket.io JSON-encodes the ack arguments and an Error's `message` is not
    // enumerable, so the server's reason arrives as `{}`. Truthy is the whole
    // of what the panel can know.
    controller.openPort.mockImplementation((port, options, done) => done({}));
    await expect(openPort('COM3')).rejects.toBeDefined();
  });

  test('closing names the port, because the server holds more than one', async () => {
    controller.closePort.mockImplementation((port, done) => done(null));
    await closePort('COM3');
    expect(controller.closePort).toHaveBeenCalledWith('COM3', expect.any(Function));
  });

  test('a close that fails rejects rather than reporting success', async () => {
    controller.closePort.mockImplementation((port, done) => done({}));
    await expect(closePort('COM3')).rejects.toBeDefined();
  });
});
