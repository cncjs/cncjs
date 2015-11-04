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
    if (!(_.includes(['data', 'write'], msg))) {
        return;
    }

    if (!(_.isFunction(callback))) {
        return;
    }

    if (msg === 'data') {
        socket.on('serialport:data', callback);
    } else if (msg === 'write') {
        let token = pubsub.subscribe('serialport:write', (msg, data) => {
            callback(data);
        });
        listeners['write'].push({
            token: token,
            callback: callback
        });
    }
};

let off = (msg, callback) => {
    if (!(_.includes(['data', 'write'], msg))) {
        return;
    }

    if (msg === 'data') {
        socket.off('serialport:data', callback);
    } else if (msg === 'write') {
        listeners['write'] = _.filter(listeners['write'], (o) => {
            if (o.callback === callback) {
                pubsub.unsubscribe('serialport:write', o.token);
            }
            return o.callback !== callback;
        });
    }
};

let write = (buffer) => {
    if (!port) {
        return;
    }

    pubsub.publishSync.apply(pubsub, ['serialport:write', buffer]);

    socket.emit.apply(socket, ['serialport:write', port, buffer]);
};

let writeln = (buffer) => {
    if (!port) {
        return;
    }

    buffer = ('' + buffer).trim() + '\n';

    pubsub.publishSync.apply(pubsub, ['serialport:write', buffer]);

    socket.emit.apply(socket, ['serialport:write', port, buffer]);
};

export default {
    on,
    off,
    write,
    writeln
};
