import io from 'socket.io-client';
import Controller from './Controller';

const controller = new Controller(io);

export default controller;
