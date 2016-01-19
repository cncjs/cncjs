import _ from 'lodash';
import pubsub from 'pubsub-js';
import socket from './socket';

class CNCController {
    port = '';
    callbacks = {
        'serialport:read': [],
        'serialport:write': []
    };

    constructor() {
        pubsub.subscribe('port', (msg, port) => {
            this.port = port || this.port;
        });

        socket.on('serialport:read', (data) => {
            this.callbacks['serialport:read'].forEach((callback) => {
                callback(data);
            });
        });

        socket.on('serialport:write', (data) => {
            this.callbacks['serialport:write'].forEach((callback) => {
                callback(data);
            });
        });
    }
    on(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (_.isArray(callbacks) && _.isFunction(callback)) {
            callbacks.push(callback);
        }
    }
    off(eventName, callback) {
        let callbacks = this.callbacks[eventName];
        if (_.isArray(callbacks) && _.isFunction(callback)) {
            callbacks.splice(callbacks.indexOf(callback), 1);
        }
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
