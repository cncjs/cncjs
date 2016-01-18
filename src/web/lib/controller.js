import _ from 'lodash';
import pubsub from 'pubsub-js';
import socket from './socket';

class CNCController {
    port = '';
    callbacks = {
        'read': [],
        'write': []
    };

    constructor() {
        pubsub.subscribe('port', (msg, port) => {
            this.port = port || this.port;
        });

        pubsub.subscribe('write', (msg, data) => {
            this.callbacks['write'].forEach((callback) => {
                callback(data);
            });
        });

        socket.on('serialport:read', (data) => {
            this.callbacks['read'].forEach((callback) => {
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
        pubsub.publishSync('command', cmd);
        socket.emit('command', port, cmd);
    }
    write(data) {
        let { port } = this;
        if (!port) {
            return;
        }
        pubsub.publishSync('write', data);
        socket.emit('write', port, data);
    }
    writeln(data) {
        data = ('' + data).trim() + '\n';
        this.write(data);
    }
}

const controller = new CNCController();

export default controller;
