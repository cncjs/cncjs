import pubsub from 'pubsub-js';
import { WORKFLOW_STATE_UNKNOWN } from '../constants';
import socket from './socket';
import log from './log';

class CNCController {
    port = '';
    callbacks = {
        'serialport:list': [],
        'serialport:open': [],
        'serialport:close': [],
        'serialport:error': [],
        'serialport:read': [],
        'serialport:write': [],
        'gcode:statuschange': [],
        'grbl:state': [],
        'tinyg:state': []
    };
    controller = {
        grbl: {
        },
        tinyg: {
        }
    };
    workflowState = WORKFLOW_STATE_UNKNOWN; // FIXME

    constructor() {
        pubsub.subscribe('port', (msg, port) => {
            this.port = port || this.port;
        });

        Object.keys(this.callbacks).forEach((eventName) => {
            socket.on(eventName, (...args) => {
                log.debug('socket.on("' + eventName + '"):', args);

                if (eventName === 'grbl:state') {
                    this.controller.grbl = args[0];
                }
                if (eventName === 'tinyg:state') {
                    this.controller.tinyg = args[0];
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
    openPort(port, baudrate) {
        socket.emit('open', port, baudrate);
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
