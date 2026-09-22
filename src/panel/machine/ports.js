import controller from './controller';

/**
 * The serial ports the server can see, and what can be done with each.
 *
 * `serialport:list` is an *event*, not the answer to the `list` call: the
 * socket client passes a callback the server never invokes and emits the
 * result to the room instead. Anything asking for ports therefore has to be
 * listening before it asks, which is the one thing about this exchange that
 * is easy to get wrong and impossible to see afterwards — the list simply
 * never arrives.
 */

/** Grbl's own rate, and what every machine on this bench runs at. */
export const DEFAULT_BAUDRATE = 115200;

/** What the server loads when nothing says otherwise. */
export const DEFAULT_CONTROLLER = 'Grbl';

/**
 * The rates worth offering, largest first.
 *
 * The old application's list, less the two nobody has used since serial
 * terminals: a rate that cannot be picked is only a rate somebody's firmware
 * has to be re-flashed for, and `config.get('baudrates')` is the escape hatch
 * for exactly that — anything written there is merged in below.
 */
const COMMON_BAUDRATES = [250000, 115200, 57600, 38400, 19200, 9600];

/** This panel holds the port and can send to it. */
export const PORT_OPEN = 'open';
/** Open on the server, but not by this panel. Connecting attaches to it. */
export const PORT_BUSY = 'inuse';
/** Closed. Connecting opens it. */
export const PORT_FREE = 'free';

const rowState = (row, held) => {
  if (held && row.port === held) {
    return PORT_OPEN;
  }
  return row.inuse ? PORT_BUSY : PORT_FREE;
};

/**
 * The list as the screen shows it.
 *
 * `held` is the port this panel is attached to, which is a different question
 * from the server's `inuse`: the old application, a second panel or a script
 * can all have a port open that this one is not listening to. The distinction
 * decides which button the row gets, and getting it wrong offers Disconnect
 * for somebody else's machine.
 *
 * Sorted by name and stripped of nameless rows. `config.get('ports')` is
 * concatenated onto the driver's own list by the server, so the order it
 * arrives in is neither stable between refreshes nor meaningful — and a list
 * that reorders itself under a finger is worse than one that is merely
 * alphabetical. A row with no port name is not something that can be opened.
 */
export const readPorts = (list, held = '') => (Array.isArray(list) ? list : [])
  .filter((row) => row && row.port)
  .map((row) => ({
    port: row.port,
    manufacturer: row.manufacturer || '',
    state: rowState(row, held),
  }))
  .sort((a, b) => a.port.localeCompare(b.port));

/**
 * Which rates to offer: the common ones, plus whatever this installation has
 * configured, deduplicated and largest first.
 *
 * The server hands its `baudrates` setting to every socket on `startup`, so a
 * machine that needs 76800 gets it into `.cncrc` once rather than into this
 * file forever.
 */
export const baudrateChoices = (configured = []) => [
  ...new Set([...COMMON_BAUDRATES, ...configured.map(Number).filter(Boolean)]),
].sort((a, b) => b - a);

/**
 * Which firmwares this server can drive.
 *
 * Asked rather than assumed: `loadedControllers` is the server's own list of
 * controller classes, and offering a choice it cannot honour means an open
 * that fails with `Not supported controller` after the port has been picked.
 */
export const controllerChoices = (loaded = []) => (
  loaded.length ? loaded : [DEFAULT_CONTROLLER]
);

/** Ask the server what it can see. The answer arrives on `serialport:list`. */
export const requestPorts = () => controller.listPorts();

/**
 * Open a port, or attach to one that is already open.
 *
 * The same call does both — the server joins the socket to the port's room
 * and only opens the hardware if nothing has it yet — which is why attaching
 * to a machine somebody else connected needs no separate command.
 *
 * **The error the server sends does not survive the wire.** `callback(new
 * Error(...))` is JSON-encoded by socket.io, and an `Error`'s `message` is not
 * enumerable, so what arrives is `{}`: truthy, and empty. Nothing here can
 * report *why* the port would not open, and a panel printing `undefined` at
 * an operator would be worse than one saying plainly that it failed.
 */
export const openPort = (port, options) => new Promise((resolve, reject) => {
  controller.openPort(port, {
    controllerType: DEFAULT_CONTROLLER,
    baudrate: DEFAULT_BAUDRATE,
    ...options,
  }, (err) => (err ? reject(err) : resolve()));
});

export const closePort = (port) => new Promise((resolve, reject) => {
  controller.closePort(port, (err) => (err ? reject(err) : resolve()));
});
