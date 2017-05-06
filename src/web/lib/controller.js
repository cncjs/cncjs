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
    callbacks = {
        'config:change': [],
        'task:start': [],
        'task:finish': [],
        'task:error': [],
        'serialport:list': [],
        'serialport:open': [],
        'serialport:close': [],
        'serialport:error': [],
        'serialport:read': [],
        'serialport:write': [],
        'feeder:status': [],
        'sender:status': [],
        'workflow:state': [],
        'Grbl:state': [],
        'Smoothie:state': [],
        'TinyG:state': []
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
    socket = null;
    workflowState = WORKFLOW_STATE_IDLE;

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
                    this.workflowState = WORKFLOW_STATE_IDLE;
                }
                if (eventName === 'workflow:state') {
                    this.workflowState = args[0];
                }
                if (eventName === 'Grbl:state') {
                    this.type = GRBL;
                    this.state = { ...args[0] };
                }
                if (eventName === 'Smoothie:state') {
                    this.type = SMOOTHIE;
                    this.state = { ...args[0] };
                }
                if (eventName === 'TinyG:state') {
                    this.type = TINYG;
                    this.state = { ...args[0] };
                }

                this.callbacks[eventName].forEach((callback) => {
                    callback.apply(callback, args);
                });
            });
        });

        this.socket.on('connect', () => {
            log.debug('socket.on(\'connect\')');
        });
        this.socket.on('error', () => {
            log.error('socket.on(\'error\')');
            this.disconnect();
        });
        this.socket.on('close', () => {
            log.debug('socket.on(\'close\')');
        });

        this.socket.on('startup', (data) => {
            const { loadedControllers, ports, baudrates } = { ...data };

            this.loadedControllers = ensureArray(loadedControllers);
            this.ports = ensureArray(ports);
            this.baudrates = ensureArray(baudrates);

            log.debug('socket.on(\'startup\'):', { loadedControllers, ports, baudrates });

            next();
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
    //   controller.command('gcode:stop')
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
    // @param {string} data The data to write
    write(data) {
        const { port } = this;
        if (!port) {
            return;
        }
        this.socket && this.socket.emit('write', port, data);
    }
    // @param {string} data The data to write
    writeln(data) {
        const { port } = this;
        if (!port) {
            return;
        }
        this.socket && this.socket.emit('writeln', port, data);
    }
}

const controller = new CNCController();

export default controller;
