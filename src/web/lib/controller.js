import pubsub from 'pubsub-js';
import log from './log';
import socket from './socket';
import {
    GRBL,
    TINYG2,
    WORKFLOW_STATE_IDLE
} from '../constants';

class CNCController {
    callbacks = {
        'serialport:list': [],
        'serialport:open': [],
        'serialport:close': [],
        'serialport:error': [],
        'serialport:read': [],
        'serialport:write': [],
        'feeder:status': [],
        'sender:status': [],
        'Grbl:state': [],
        'TinyG2:state': []
    };

    port = '';
    workflowState = WORKFLOW_STATE_IDLE;
    type = '';
    state = {};

    constructor() {
        pubsub.subscribe('port', (msg, port) => {
            this.port = port;
            if (!this.port) {
                this.workflowState = WORKFLOW_STATE_IDLE;
                this.type = '';
                this.state = {};
            }
        });

        pubsub.subscribe('workflowState', (msg, workflowState) => {
            this.workflowState = workflowState;
        });

        Object.keys(this.callbacks).forEach((eventName) => {
            socket.on(eventName, (...args) => {
                log.debug('socket.on("' + eventName + '"):', args);

                if (eventName === 'Grbl:state') {
                    this.type = GRBL;
                    this.state = { ...args[0] };
                }
                if (eventName === 'TinyG2:state') {
                    this.type = TINYG2;
                    this.state = { ...args[0] };
                }

                this.callbacks[eventName].forEach((callback) => {
                    callback.apply(callback, args);
                });
            });
        });
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
        socket.emit('open', port, options);
    }
    closePort(port) {
        socket.emit('close', port);
    }
    listAllPorts() {
        socket.emit('list');
    }
    // @param {string} cmd The command string
    // @example Example Usage
    // - Load G-code
    //   controller.command('load', name, gcode, callback)
    // - Unload G-code
    //   controller.command('unload')
    // - Start sending G-code
    //   controller.command('start')
    // - Stop sending G-code
    //   controller.command('stop')
    // - Pause
    //   controller.command('pause')
    // - Resume
    //   controller.command('resume')
    // - Feed Hold
    //   controller.command('feedhold')
    // - Cycle Start
    //   controller.command('cyclestart')
    // - Reset
    //   controller.command('reset')
    // - Homing
    //   controller.command('homing')
    // - Unlock
    //   controller.command('unlock')
    // - G-code
    //   controller.command('gcode', 'G0X0Y0')
    // - Macro
    //   controller.command('macro', '<macro-id>', callback)
    command(cmd, ...args) {
        const { port } = this;
        if (!port) {
            return;
        }
        socket.emit.apply(socket, ['command', port, cmd].concat(args));
    }
    // @param {string} data The data to write
    write(data) {
        const { port } = this;
        if (!port) {
            return;
        }
        socket.emit('write', port, data);
    }
    // @param {string} data The data to write
    writeln(data) {
        data = ('' + data).trim() + '\n';
        this.write(data);
    }
}

const controller = new CNCController();

export default controller;
