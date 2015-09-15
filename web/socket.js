import log from './lib/log';

let socket = root.io.connect('');

socket.on('connect', () => {
    log.debug('socket.io: connected');
});
socket.on('error', () => {
    log.error('socket.io: error');
    socket.destroy();
});
socket.on('close', () => {
    log.debug('socket.io: closed');
});

export default socket;
