import _ from 'lodash';
import pubsub from 'pubsub-js';
import socket from './socket';
import log from './log';

class CNCController {
    port = '';
    gcode = {
        load: () => {},
        unload: () => socket.emit('gcode:unload', this.port),
        start: () => socket.emit('gcode:start', this.port),
        pause: () => socket.emit('gcode:pause', this.port),
        resume: () => socket.emit('gcode:resume', this.port),
        stop: () => socket.emit('gcode:stop', this.port)
    };
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
    command(cmd) {
        let { port } = this;
        if (!port) {
            return;
        }
        socket.emit('command', port, cmd);
    }
    write(data) {
        let { port } = this;
        if (!port) {
            return;
        }
        socket.emit('write', port, data);
    }
    writeln(data) {
        data = ('' + data).trim() + '\n';
        this.write(data);
    }
}

const controller = new CNCController();

export default controller;
