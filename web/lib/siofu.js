import socket from './socket';
import SocketIOFileUpload from 'socketio-file-upload';

let siofu = new SocketIOFileUpload(socket);

// https://github.com/vote539/socketio-file-upload#instanceusetext--false
siofu.useText = true;

export default siofu;
