import noop from 'lodash/noop';
import io from 'socket.io-client';
import store from '../store';
import ensureArray from './ensure-array';
import log from './log';
import {
    GRBL,
    SMOOTHIE,
    TINYG,
    WORKFLOW_STATE_IDLE
} from '../constants';

class CNCController {
    socket = null;

    callbacks = {
        //
        // Socket.IO Events
        //
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

        //
        // System Events
        //
        'startup': [],
        'config:change': [],
        'task:start': [],
        'task:finish': [],
        'task:error': [],
        'serialport:list': [],
        'serialport:change': [],
        'serialport:open': [],
        'serialport:close': [],
        'serialport:error': [],
        'serialport:read': [],
        'serialport:write': [],
        'gcode:load': [],
        'gcode:unload': [],
        'feeder:status': [],
        'sender:status': [],
        'workflow:state': [],
        'Grbl:state': [],
        'Grbl:settings': [],
        'Smoothie:state': [],
        'Smoothie:settings': [],
        'TinyG:state': [],
        'TinyG:settings': []
    };

    context = {
        xmin: 0,
        xmax: 0,
        ymin: 0,
        ymax: 0,
        zmin: 0,
        zmax: 0
    };

    // user-defined baud rates and ports
    baudrates = [];
    ports = [];

    loadedControllers = [GRBL, SMOOTHIE, TINYG];
    port = '';
    type = '';
    state = {};
    settings = {};
    workflowState = WORKFLOW_STATE_IDLE;

    get connected() {
        return !!(this.socket && this.socket.connected);
    }
    connect(next = noop) {
        if (typeof next !== 'function') {
            next = noop;
        }

        this.socket && this.socket.destroy();

        const token = store.get('session.token');
        this.socket = io.connect('', {
            query: 'token=' + token
        });

        Object.keys(this.callbacks).forEach((eventName) => {
            if (!this.socket) {
                return;
            }

            this.socket.on(eventName, (...args) => {
                log.debug(`socket.on('${eventName}'):`, args);

                if (eventName === 'serialport:open') {
                    const { controllerType, port } = { ...args[0] };
                    this.port = port;
                    this.type = controllerType;
                }
                if (eventName === 'serialport:close') {
                    this.port = '';
                    this.type = '';
                    this.state = {};
                    this.settings = {};
                    this.workflowState = WORKFLOW_STATE_IDLE;
                }
                if (eventName === 'workflow:state') {
                    this.workflowState = args[0];
                }
                if (eventName === 'Grbl:state') {
                    this.type = GRBL;
                    this.state = { ...args[0] };
                }
                if (eventName === 'Grbl:settings') {
                    this.type = GRBL;
                    this.settings = { ...args[0] };
                }
                if (eventName === 'Smoothie:state') {
                    this.type = SMOOTHIE;
                    this.state = { ...args[0] };
                }
                if (eventName === 'Smoothie:settings') {
                    this.type = SMOOTHIE;
                    this.settings = { ...args[0] };
                }
                if (eventName === 'TinyG:state') {
                    this.type = TINYG;
                    this.state = { ...args[0] };
                }
                if (eventName === 'TinyG:settings') {
                    this.type = TINYG;
                    this.settings = { ...args[0] };
                }

                this.callbacks[eventName].forEach((callback) => {
                    callback.apply(callback, args);
                });
            });
        });

        this.socket.on('startup', (data) => {
            const { loadedControllers, ports, baudrates } = { ...data };

            this.loadedControllers = ensureArray(loadedControllers);
            this.ports = ensureArray(ports);
            this.baudrates = ensureArray(baudrates);

            log.debug('socket.on(\'startup\'):', { loadedControllers, ports, baudrates });

            if (next) {
                next();

                // The callback can only be called once
                next = null;
            }
        });
    }
    disconnect() {
        this.socket && this.socket.destroy();
        this.socket = null;
    }
    on(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (!callbacks) {
            log.error('Undefined event name:', eventName);
            return;
        }
        if (typeof callback === 'function') {
            callbacks.push(callback);
        }
    }
    off(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (!callbacks) {
            log.error('Undefined event name:', eventName);
            return;
        }
        if (typeof callback === 'function') {
            callbacks.splice(callbacks.indexOf(callback), 1);
        }
    }
    openPort(port, options, callback) {
        this.socket && this.socket.emit('open', port, options, callback);
    }
    closePort(port, callback) {
        this.socket && this.socket.emit('close', port, callback);
    }
    listPorts() {
        this.socket && this.socket.emit('list');
    }
    // @param {string} cmd The command string
    // @example Example Usage
    // - Load G-code
    //   controller.command('gcode:load', name, gcode, context /* optional */, callback)
    // - Unload G-code
    //   controller.command('gcode:unload')
    // - Start sending G-code
    //   controller.command('gcode:start')
    // - Stop sending G-code
    //   controller.command('gcode:stop', { force: true })
    // - Pause
    //   controller.command('gcode:pause')
    // - Resume
    //   controller.command('gcode:resume')
    // - Feed Hold
    //   controller.command('feedhold')
    // - Cycle Start
    //   controller.command('cyclestart')
    // - Status Report
    //   controller.command('statusreport')
    // - Homing
    //   controller.command('homing')
    // - Sleep
    //   controller.command('sleep')
    // - Unlock
    //   controller.command('unlock')
    // - Reset
    //   controller.command('reset')
    // - Feed Override
    //   controller.command('feedOverride')
    // - Spindle Override
    //   controller.command('spindleOverride')
    // - Rapid Override
    //   controller.command('rapidOverride')
    // - Energize Motors
    //   controller.command('energizeMotors:on')
    //   controller.command('energizeMotors:off')
    // - G-code
    //   controller.command('gcode', 'G0X0Y0', context /* optional */)
    // - Load a macro
    //   controller.command('macro:load', '<macro-id>', context /* optional */, callback)
    // - Run a macro
    //   controller.command('macro:run', '<macro-id>', context /* optional */, callback)
    // - Load file from a watch directory
    //   controller.command('watchdir:load', '/path/to/file', callback)
    command(cmd, ...args) {
        const { port } = this;
        if (!port) {
            return;
        }
        this.socket && this.socket.emit.apply(this.socket, ['command', port, cmd].concat(args));
    }
    // @param {string} data The data to write.
    // @param {object} [context] The associated context information.
    write(data, context) {
        const { port } = this;
        if (!port) {
            return;
        }
        this.socket && this.socket.emit('write', port, data, context);
    }
    // @param {string} data The data to write.
    // @param {object} [context] The associated context information.
    writeln(data, context) {
        const { port } = this;
        if (!port) {
            return;
        }
        this.socket && this.socket.emit('writeln', port, data, context);
    }
}

const controller = new CNCController();

export default controller;
