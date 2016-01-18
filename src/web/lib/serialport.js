import _ from 'lodash';
import pubsub from 'pubsub-js';
import socket from './socket';

let port = '';
let listeners = {
    'write': []
};

pubsub.subscribe('port', (msg, _port) => {
    port = _port || port;
});

const on = (msg, callback) => {
    if (!(_.includes(['read', 'write'], msg))) {
        return;
    }

    if (!(_.isFunction(callback))) {
        return;
    }

    if (msg === 'read') {
        socket.on('serialport:read', callback);
    } else if (msg === 'write') {
        let token = pubsub.subscribe('write', (msg, data) => {
            callback(data);
        });
        listeners['write'].push({
            token: token,
            callback: callback
        });
    }
};

const off = (msg, callback) => {
    if (!(_.includes(['read', 'write'], msg))) {
        return;
    }

    if (msg === 'read') {
        socket.off('serialport:read', callback);
    } else if (msg === 'write') {
        listeners['write'] = _.filter(listeners['write'], (o) => {
            if (o.callback === callback) {
                pubsub.unsubscribe('write', o.token);
            }
            return o.callback !== callback;
        });
    }
};

const command = (data) => {
    if (!port) {
        return;
    }

    pubsub.publishSync.apply(pubsub, ['command', data]);
    socket.emit.apply(socket, ['command', port, data]);
};

const write = (data) => {
    if (!port) {
        return;
    }

    pubsub.publishSync.apply(pubsub, ['write', data]);
    socket.emit.apply(socket, ['write', port, data]);
};

const writeln = (data) => {
    if (!port) {
        return;
    }

    data = ('' + data).trim() + '\n';
    pubsub.publishSync.apply(pubsub, ['write', data]);
    socket.emit.apply(socket, ['write', port, data]);
};

export default {
    on,
    off,
    command,
    write,
    writeln
};
