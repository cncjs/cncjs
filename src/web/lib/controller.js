import Controller from 'cncjs-controller';
import io from 'socket.io-client';

const controller = new Controller(io);

export default controller;
