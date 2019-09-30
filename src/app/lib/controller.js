//import Controller from 'cncjs-controller';
import io from 'socket.io-client';
import Controller from './CNCJSController';

const controller = new Controller(io);

export default controller;
