import ensureArray from 'ensure-array';
import _mapValues from 'lodash/mapValues';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS,
    // Controller
    GRBL,
    MARLIN,
    SMOOTHIE,
    TINYG
} from 'app/constants';
import { in2mm } from 'app/lib/units';

const noop = () => {};

class CNCJSController {
    io = null;

    socket = null;

    listeners = {
        // Socket.IO Events
        // Fired upon a connection including a successful reconnection.
        'connect': [],
        // Fired upon a connection error.
        'connect_error': [],
        // Fired upon a connection timeout.
        'connect_timeout': [],
        // Fired when an error occurs.
        'error': [],
        // Fired upon a disconnection.
        'disconnect': [],
        // Fired upon a successful reconnection.
        'reconnect': [],
        // Fired upon an attempt to reconnect.
        'reconnect_attempt': [],
        // Fired upon an attempt to reconnect.
        'reconnecting': [],
        // Fired upon a reconnection attempt error.
        'reconnect_error': [],
        // Fired when couldn't reconnect within reconnectionAttempts.
        'reconnect_failed': [],

        // System Events
        'startup': [],
        'config:change': [],
        'task:start': [],
        'task:finish': [],
        'task:error': [],
        'controller:type': [],
        'controller:settings': [],
        'controller:state': [],
        'connection:open': [],
        'connection:close': [],
        'connection:change': [],
        'connection:error': [],
        'connection:read': [],
        'connection:write': [],
        'feeder:status': [],
        'sender:status': [],
        'sender:load': [],
        'sender:unload': [],
        'workflow:state': [],
        'message': [],
    };

    context = {
        xmin: 0,
        xmax: 0,
        ymin: 0,
        ymax: 0,
        zmin: 0,
        zmax: 0,
    };

    // An array of available controllers: 'Grbl', 'Marlin', 'Smoothie', 'TinyG'
    availableControllers = [];

    // The controller type. One of: 'Grbl', 'Marlin', 'Smoothie', 'TinyG'
    type = '';

    // The controller settings.
    settings = {};

    // The controller state.
    state = {};

    connection = {
        // The connection type. One of: 'serial', 'socket'
        type: null,

        // The connection ident.
        ident: null,

        // The connection options.
        options: {},
    };

    workflow = {
        // The workflow state. One of: 'running', 'paused', 'idle'
        state: 'idle',
    };

    // Whether the client is connected to the server.
    // @return {boolean} Returns true if the client is connected to the server, false otherwise.
    get connected() {
        return !!(this.socket && this.socket.connected);
    }

    // @param {object} io The socket.io-client module.
    constructor(io) {
        if (!io) {
            throw new Error(`Expected the socket.io-client module, but got: ${io}`);
        }

        this.io = io;
    }

    // Establish a connection to the server.
    // @param {string} host
    // @param {object} options
    // @param {function} callback
    connect(host = '', options = {}, callback = noop) {
        if (typeof callback !== 'function') {
            callback = noop;
        }

        this.socket && this.socket.destroy();
        this.socket = this.io.connect(host, options);

        Object.keys(this.listeners).forEach((eventName) => {
            if (!this.socket) {
                return;
            }

            this.socket.on(eventName, (...args) => {
                if (eventName === 'controller:type') {
                    this.type = args[0];
                }
                if (eventName === 'controller:settings') {
                    this.type = args[0];
                    this.settings = { ...args[1] };
                }
                if (eventName === 'controller:state') {
                    this.type = args[0];
                    this.state = { ...args[1] };
                }
                if (eventName === 'connection:open') {
                    const { type, ident, options } = { ...args[0] };
                    this.connection.type = type;
                    this.connection.ident = ident;
                    this.connection.options = options;
                }
                if (eventName === 'connection:close') {
                    this.type = '';
                    this.settings = {};
                    this.state = {};
                    this.connection.type = null;
                    this.connection.ident = null;
                    this.connection.options = {};
                    this.workflow.state = 'idle';
                }
                if (eventName === 'workflow:state') {
                    this.workflow.state = args[0];
                }

                const listeners = ensureArray(this.listeners[eventName]);
                listeners.forEach(listener => {
                    listener(...args);
                });
            });
        });

        this.socket.on('startup', (data) => {
            const { availableControllers } = { ...data };

            this.availableControllers = ensureArray(availableControllers);

            if (callback) {
                callback(null);

                // The callback can only be called once
                callback = null;
            }
        });
    }

    // Disconnect from the server.
    disconnect() {
        this.socket && this.socket.destroy();
        this.socket = null;
    }

    // Adds the `listener` function to the end of the listeners array for the event named `eventName`.
    // @param {string} eventName The name of the event.
    // @param {function} listener The listener function.
    addListener(eventName, listener) {
        const listeners = this.listeners[eventName];
        if (!listeners || typeof listener !== 'function') {
            return false;
        }
        listeners.push(listener);
        return true;
    }

    // Removes the specified `listener` from the listener array for the event named `eventName`.
    // @param {string} eventName The name of the event.
    // @param {function} listener The listener function.
    removeListener(eventName, listener) {
        const listeners = this.listeners[eventName];
        if (!listeners || typeof listener !== 'function') {
            return false;
        }
        listeners.splice(listeners.indexOf(listener), 1);
        return true;
    }

    // Opens a connection.
    // @param {string} controllerType One of: 'Grbl', 'Smoothe', 'TinyG'.
    // @param {string} connectionType One of: 'serial', 'socket'.
    // @param {object} options The options object.
    // @param {string} options.path `serial` The serial port referenced by the path.
    // @param {number} [options.baudRate=115200] `serial` The baud rate.
    // @param {string} options.host `socket` The host address to connect.
    // @param {number} [options.port=23] `socket` The port number.
    // @param {function} [callback] Called after a connection is opened.
    open(controllerType, connectionType, options, callback = noop) {
        if (typeof options !== 'object') {
            options = {};
            callback = options;
        }
        if (typeof callback !== 'function') {
            callback = noop;
        }
        if (!this.socket) {
            return;
        }
        this.socket.emit('open', controllerType, connectionType, options, (err, ...args) => {
            if (!err) {
                const { ident } = { ...args[0] };
                this.connection.ident = ident;
            }

            callback(err, ...args);
        });
    }

    // Closes an open connection.
    // @param {function} [callback] Called once a connection is closed.
    close(callback = noop) {
        if (typeof callback !== 'function') {
            callback = noop;
        }
        if (!this.socket) {
            return;
        }
        if (!this.connection.ident) {
            return;
        }
        this.socket.emit('close', this.connection.ident, (err, ...args) => {
            this.connection.ident = '';
            callback(err, ...args);
        });
    }

    // Executes a command on the server.
    // @param {string} cmd The command to execute.
    // @example Example Usage
    // - Load G-code
    //   controller.command('sender:load', name, gcode, [context], [callback])
    // - Unload G-code
    //   controller.command('sender:unload')
    // - Start sending G-code
    //   controller.command('sender:start')
    // - Stop sending G-code
    //   controller.command('sender:stop', { force: true })
    // - Pause
    //   controller.command('sender:pause')
    // - Resume
    //   controller.command('sender:resume')
    // - Feeder
    //   controller.command('feeder:start')
    //   controller.command('feeder:stop')
    // - Feed Hold
    //   controller.command('feedhold')
    // - Cycle Start
    //   controller.command('cyclestart')
    // - Homing
    //   controller.command('homing')
    // - Sleep
    //   controller.command('sleep')
    // - Unlock
    //   controller.command('unlock')
    // - Reset
    //   controller.command('reset')
    // - Feed Override
    //   controller.command('override:feed')
    // - Spindle Override
    //   controller.command('override:spindle')
    // - Rapid Override
    //   controller.command('override:rapid')
    // - Laser Test
    //   controller.command('lasertest', [power=0], [duration=0], [maxS=1000])
    // - G-code
    //   controller.command('gcode', gcode, [context])
    // - Load a macro
    //   controller.command('macro:load', id, [context], [callback])
    // - Run a macro
    //   controller.command('macro:run', id, [context], [callback])
    // - Load file from a watch directory
    //   controller.command('watchdir:load', '/path/to/file', callback)
    command(cmd, ...args) {
        if (!this.socket) {
            return;
        }
        if (!this.connection.ident) {
            return;
        }
        this.socket.emit('command', this.connection.ident, cmd, ...args);
    }

    // Writes data to the open connection.
    // @param {string} data The data to write.
    // @param {object} [context] The associated context information.
    write(data, context) {
        if (!this.socket) {
            return;
        }
        if (!this.connection.ident) {
            return;
        }
        this.socket.emit('write', this.connection.ident, data, context);
    }

    // Writes data and a newline character to the open connection.
    // @param {string} data The data to write.
    // @param {object} [context] The associated context information.
    writeln(data, context) {
        if (!this.socket) {
            return;
        }
        if (!this.connection.ident) {
            return;
        }
        this.socket.emit('writeln', this.connection.ident, data, context);
    }

    // Gets a list of available serial ports.
    // @param {function} [callback] The error-first callback.
    getPorts(callback = noop) {
        if (typeof callback !== 'function') {
            callback = noop;
        }
        if (!this.socket) {
            callback(new Error('The socket is not connected'));
            return;
        }
        this.socket.emit('getPorts', callback);
    }

    // Gets a list of supported baud rates.
    // @param {function} [callback] The error-first callback.
    getBaudRates(callback = noop) {
        if (typeof callback !== 'function') {
            callback = noop;
        }
        if (!this.socket) {
            callback(new Error('The socket is not connected'));
            return;
        }
        this.socket.emit('getBaudRates', callback);
    }

    // Gets the machine state.
    // @return {string|number} Returns the machine state.
    getMachineState() {
        if ([GRBL, MARLIN, SMOOTHIE, TINYG].indexOf(this.type) < 0) {
            return '';
        }

        if (!this.connection.ident) {
            return '';
        }

        let machineState;

        if (this.type === GRBL) {
            machineState = this.state.machineState;
        } else if (this.type === MARLIN) {
            machineState = this.state.machineState;
        } else if (this.type === SMOOTHIE) {
            machineState = this.state.machineState;
        } else if (this.type === TINYG) {
            machineState = this.state.machineState;
        }

        return machineState || '';
    }

    // Gets the machine position.
    // @return {object} Returns a position object which contains x, y, z, a, b, and c properties.
    getMachinePosition() {
        const defaultMachinePosition = {
            x: '0.000',
            y: '0.000',
            z: '0.000',
            a: '0.000',
            b: '0.000',
            c: '0.000'
        };

        // Grbl
        if (this.type === GRBL) {
            const { mpos } = this.state;
            let { $13 = 0 } = { ...this.settings.settings };
            $13 = Number($13) || 0;

            // Machine position is reported in mm ($13=0) or inches ($13=1)
            return _mapValues({
                ...defaultMachinePosition,
                ...mpos
            }, (val) => {
                return ($13 > 0) ? in2mm(val) : val;
            });
        }

        // Marlin
        if (this.type === MARLIN) {
            const { pos } = this.state;

            // Machine position is reported in mm regardless of the current units
            return {
                ...defaultMachinePosition,
                ...pos
            };
        }

        // Smoothieware
        if (this.type === SMOOTHIE) {
            const { mpos, modal = {} } = this.state;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units];

            // Machine position is reported in current units
            return _mapValues({
                ...defaultMachinePosition,
                ...mpos
            }, (val) => {
                return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
            });
        }

        // TinyG
        if (this.type === TINYG) {
            const { mpos } = this.state;

            // https://github.com/synthetos/g2/wiki/Status-Reports
            // Canonical machine position are always reported in millimeters with no offsets.
            return {
                ...defaultMachinePosition,
                ...mpos
            };
        }

        return defaultMachinePosition;
    }

    // Gets the work position.
    // @return {object} Returns a position object which contains x, y, z, a, b, and c properties.
    getWorkPosition() {
        const defaultWorkPosition = {
            x: '0.000',
            y: '0.000',
            z: '0.000',
            a: '0.000',
            b: '0.000',
            c: '0.000'
        };

        // Grbl
        if (this.type === GRBL) {
            const { wpos } = this.state;
            let { $13 = 0 } = { ...this.settings.settings };
            $13 = Number($13) || 0;

            // Work position is reported in mm ($13=0) or inches ($13=1)
            return _mapValues({
                ...defaultWorkPosition,
                ...wpos
            }, val => {
                return ($13 > 0) ? in2mm(val) : val;
            });
        }

        // Marlin
        if (this.type === MARLIN) {
            const { pos } = this.state;

            // Work position is reported in mm regardless of the current units
            return {
                ...defaultWorkPosition,
                ...pos
            };
        }

        // Smoothieware
        if (this.type === SMOOTHIE) {
            const { wpos, modal = {} } = this.state;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units];

            // Work position is reported in current units
            return _mapValues({
                ...defaultWorkPosition,
                ...wpos
            }, (val) => {
                return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
            });
        }

        // TinyG
        if (this.type === TINYG) {
            const { wpos, modal = {} } = this.state;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units];

            // Work position is reported in current units, and also apply any offsets.
            return _mapValues({
                ...defaultWorkPosition,
                ...wpos
            }, (val) => {
                return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
            });
        }

        return defaultWorkPosition;
    }

    // Gets modal state.
    // @return {object} Returns the modal state.
    getModalState() {
        const defaultModalState = {
            motion: '', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
            plane: '', // G17: xy-plane, G18: xz-plane, G19: yz-plane
            units: '', // G20: Inches, G21: Millimeters
            wcs: '', // G54, G55, G56, G57, G58, G59
            path: '', // G61: Exact path mode, G61.1: Exact stop mode, G64: Continuous mode
            distance: '', // G90: Absolute, G91: Relative
            feedrate: '', // G93: Inverse time mode, G94: Units per minute
            program: '', // M0, M1, M2, M30
            spindle: '', // M3: Spindle (cw), M4: Spindle (ccw), M5: Spindle off
            coolant: '' // M7: Mist coolant, M8: Flood coolant, M9: Coolant off, [M7,M8]: Both on
        };

        if (this.type === GRBL) {
            return {
                ...defaultModalState,
                ...this.state.modal
            };
        }

        if (this.type === MARLIN) {
            return {
                ...defaultModalState,
                ...this.state.modal
            };
        }

        if (this.type === SMOOTHIE) {
            return {
                ...defaultModalState,
                ...this.state.modal
            };
        }

        if (this.type === TINYG) {
            return {
                ...defaultModalState,
                ...this.state.modal
            };
        }

        return defaultModalState;
    }
}

export default CNCJSController;
