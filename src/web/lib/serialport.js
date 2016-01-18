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

let on = (msg, callback) => {
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

let off = (msg, callback) => {
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

let write = (buffer) => {
    if (!port) {
        return;
    }

    pubsub.publishSync.apply(pubsub, ['write', buffer]);

    socket.emit.apply(socket, ['write', port, buffer]);
};

let writeln = (buffer) => {
    if (!port) {
        return;
    }

    buffer = ('' + buffer).trim() + '\n';

    pubsub.publishSync.apply(pubsub, ['write', buffer]);

    socket.emit.apply(socket, ['write', port, buffer]);
};

export default {
    on,
    off,
    write,
    writeln
};
