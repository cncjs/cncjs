import pubsub from 'pubsub-js';
import io from 'socket.io-client';
import store from '../store';
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

    port = '';
    workflowState = WORKFLOW_STATE_IDLE;
    type = '';
    state = {};
    socket = null;

    constructor() {
        pubsub.subscribe('port', (msg, port) => {
            this.port = port;
            if (!this.port) {
                this.workflowState = WORKFLOW_STATE_IDLE;
                this.type = '';
                this.state = {};
            }
        });
    }
    connect() {
        this.socket && this.socket.destroy();

        const token = store.get('session.token');
        this.socket = io.connect('', {
            query: 'token=' + token
        });

        this.socket.on('connect', () => {
            log.debug('socket.io: connected');
        });

        this.socket.on('error', () => {
            log.error('socket.io: error');
            this.disconnect();
        });

        this.socket.on('close', () => {
            log.debug('socket.io: closed');
        });

        Object.keys(this.callbacks).forEach((eventName) => {
            if (!this.socket) {
                return;
            }

            this.socket.on(eventName, (...args) => {
                log.debug('socket.on("' + eventName + '"):', args);

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
    openPort(port, options) {
        this.socket && this.socket.emit('open', port, options);
    }
    closePort(port) {
        this.socket && this.socket.emit('close', port);
    }
    listAllPorts() {
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
