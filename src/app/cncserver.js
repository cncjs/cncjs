import _ from 'lodash';
import pubsub from 'pubsub-js';
import rangeCheck from 'range_check';
import serialport from 'serialport';
import socketIO from 'socket.io';
import { controllers } from './store';
import log from './lib/log';
import settings from './config/settings';
import Grbl from './grbl';
import CommandQueue from './CommandQueue';

const ALLOWED_IP_RANGES = [
    // IPv4 reserved space
    '10.0.0.0/8', // Used for local communications within a private network
    '127.0.0.0/8', // Used for loopback addresses to the local host
    '172.16.0.0/12', // Used for local communications within a private network
    '192.168.0.0/16', // Used for local communications within a private network

    // IPv4 mapped IPv6 address
    '::ffff:10.0.0.0/8',
    '::ffff:127.0.0.0/8',
    '::ffff:172.16.0.0/12',
    '::ffff:192.168.0.0/16',

    // IPv6 reserved space
    '::1/128', // loopback address to the local host
    'fc00::/7', // Unique local address
    'fe80::/10' // Link-local address
];

class CNCController {
    serialport = null;
    controller = null;
    queue = new CommandQueue();
    gcode = '';
    sockets = [];

    constructor(serialport) {
        this.serialport = serialport;
    }
    isOpen() {
        return this.serialport.isOpen();
    }
    isClose() {
        return !(this.isOpen());
    }
    getPort() {
        return this.serialport.path;
    }
    connect(socket) {
        this.sockets.push(socket);
    }
    disconnect(socket) {
        this.sockets.splice(this.sockets.indexOf(socket), 1);
    }
    open(callback) {
        this.controller.open(callback);
    }
    close(callback) {
        this.controller.close(callback);
    }
}

class GrblController extends CNCController {
    constructor(serialport) {
        super(serialport);

        this.controller = new Grbl(serialport);
    }
}

class CNCServer {
    server = null;
    sockets = [];
    controllers = controllers;

    constructor(server) {
        this.server = server;
    }
    start() {
        let io = socketIO(this.server, {
            serveClient: true,
            path: '/socket.io'
        });

        io.use((socket, next) => {
            let address = socket.handshake.address;
            let allowed = _.some(ALLOWED_IP_RANGES, (range) => {
                return rangeCheck.inRange(address, range);
            });

            if (!allowed) {
                log.warn('Reject connection from %s', address);
                next(new Error('You are not allowed on this server!'));
                return;
            }

            next();
        });

        io.on('connection', (socket) => {
            let address = socket.handshake.address;
            log.debug('New connection from %s', address);

            // Add to the socket pool
            this.sockets.push(socket);

            socket.on('disconnect', () => {
                log.debug('socket.on(\'%s\'):', 'disconnect', { id: socket.id });

                _.each(this.controllers, (controller, port) => {
                    controller.disconnect(socket);
                });

                // Remove from the socket pool
                this.sockets.splice(this.sockets.indexOf(socket), 1);
            });

            // Show available serial ports
            socket.on('list', () => {
                log.debug('socket.on(\'%s\'):', 'list', { id: socket.id });

                serialport.list((err, ports) => {
                    if (err) {
                        log.error(err);
                        return;
                    }

                    ports = ports.concat(_.get(settings, 'cnc.ports') || []);

                    let portsInUse = _(this.controllers)
                        .filter((controller) => {
                            return controller.isOpen();
                        })
                        .map((controller) => {
                            return controller.getPort();
                        })
                        .value();
                    
                    ports = _.map(ports, (port) => {
                        return {
                            port: port.comName,
                            manufacturer: port.manufacturer,
                            inuse: _.includes(portsInUse, port.comName) ? true : false
                        };
                    });

                    log.debug('serialport.list():', ports);
                    socket.emit('serialport:list', ports);
                });
            });

            // Open serial port
            socket.on('open', (port, baudrate) => {
                log.debug('socket.on(\'%s\'):', 'open', { id: socket.id, port: port, baudrate: baudrate });
                
                let controller = this.controllers[port];
                if (!controller) {
                    const sp = new serialport.SerialPort(port, {
                        baudrate: baudrate,
                        parser: serialport.parsers.readline('\n')
                    }, false);

                    controller = new GrblController(sp);
                }

                if (controller.isOpen()) {
                    controller.connect(socket);
                    socket.emit('serialport:open', {
                        port: port,
                        baudrate: baudrate,
                        inuse: true
                    });
                    return;
                }

                controller.open((err) => {
                    if (err) {
                        socket.emit('serialport:error', {
                            port: port
                        });
                        return;
                    }

                    // It should default to an undefined value
                    console.assert(_.isUndefined(this.controllers[port]));
                    this.controllers[port] = controller;

                    controller.connect(socket);
                    socket.emit('serialport:open', {
                        port: port,
                        baudrate: baudrate,
                        inuse: true
                    });
                });
            });

            // Close serial port
            socket.on('close', (port) => {
                log.debug('socket.on(\'%s\'):', 'close', { id: socket.id, port: port });

                let controller = this.controllers[port];

                if (!controller) {
                    log.warn('No controller found on serial port \'%s\'', port);
                    return;
                }

                controller.close((err) => {
                    this.controllers[port] = undefined;
                    delete this.controllers[port];
                });
            });
        });
    }
    stop() {
    }
}

const serverMain = (server) => {
    let cncServer = new CNCServer(server);
    cncServer.start();
};

module.exports = serverMain;
