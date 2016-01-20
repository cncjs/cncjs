import _ from 'lodash';
import pubsub from 'pubsub-js';
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
        'grbl:status': [],
        'grbl:parserstate': [],
        'gcode:statuschange': []
    };

    constructor() {
        pubsub.subscribe('port', (msg, port) => {
            this.port = port || this.port;
        });

        Object.keys(this.callbacks).forEach((eventName) => {
            socket.on(eventName, function() {
                let args = Array.prototype.slice.call(arguments);
                this.callbacks[eventName].forEach((callback) => {
                    callback.apply(callback, args);
                });
            }.bind(this));
        });
    }
    on(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (!callbacks) {
            log.error('Undefined event name:', eventName);
            return;
        }
        if (_.isFunction(callback)) {
            callbacks.push(callback);
        }
    }
    off(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (!callbacks) {
            log.error('Undefined event name:', eventName);
            return;
        }
        if (_.isFunction(callback)) {
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
        let { port } = this;
        if (!port) {
            return;
        }
        socket.emit.apply(socket, ['command', port, cmd].concat(args));
    }
    // @param {string} data The data to write
    write(data) {
        let { port } = this;
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
