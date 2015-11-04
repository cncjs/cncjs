import pubsub from 'pubsub-js';
import socket from './socket';

let port = '';

pubsub.subscribe('port', (msg, _port) => {
    port = _port || port;
});

let on = (msg, callback) => {
    if (msg === 'data') {
        socket.on('serialport:data', callback);
    } else if (msg === 'write') {
        pubsub.subscribe('serialport:write', callback);
    }
};

let off = (msg, callback) => {
    if (msg === 'data') {
        socket.off('serialport:data', callback);
    } else if (msg === 'write') {
        pubsub.unsubscribe('serialport:write', callback);
    }
};

let write = (buffer) => {
    if (!port) {
        return;
    }

    pubsub.publish.apply(pubsub, ['serialport:write', buffer]);
    socket.emit.apply(socket, ['serialport:write', port, buffer]);
};

let writeln = (buffer) => {
    if (!port) {
        return;
    }

    buffer = ('' + buffer).trim() + '\n';

    pubsub.publish.apply(pubsub, ['serialport:write', buffer]);
    socket.emit.apply(socket, ['serialport:write', port, buffer]);
};

export default {
    on,
    off,
    write,
    writeln
};
