import _ from 'lodash';
import serialport from 'serialport';
import socketIO from 'socket.io';
import rangeCheck from 'range_check';
import log from './lib/log';
import settings from './config/settings';
import Grbl from './grbl';

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

class GrblController {
    controller = new Grbl();
    gcode = '';
    sockets = [];

    constructor(serialport) {
        this.controller = new Grbl(serialport);
    }
    open(socket) {
        this.sockets.push(socket);
        this.controller.open();
    }
    close(socket) {
        this.sockets.splice(this.sockets.indexOf(socket), 1);
        if (this.sockets.length === 0) {
            this.controller.close();
        }
    }
}

class CNCServer {
    server = null;
    sessions = [];
    controllers = {};

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

            this.sessions.push({
                id: socket.id,
                address: address,
                socket: socket,
                lastCommand: ''
            });

            socket.on('disconnect', () => {
                log.debug('socket.on(\'%s\'):', 'disconnect', { id: socket.id });

                this.sessions.splice(_.findIndex(this.sessions, { id: socket.id }), 1);

                // Remove the socket of the disconnected client
                /* FIXME
                _.each(store.connection, (sp) => {
                    sp.sockets[socket.id] = undefined;
                    delete sp.sockets[socket.id];
                });
                */
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

                    let portsInUse = [];
                    /* // FIXME
                    let portsInUse = _(store.connection)
                        .filter((sp) => {
                            return sp.serialPort && sp.serialPort.isOpen();
                        })
                        .map((sp) => {
                            return sp.port;
                        })
                        .value();
                    */
                    
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

                    controller = this.controllers[port] = new GrblController(sp);
                }
                controller.open(socket);
            });

            // Close serial port
            socket.on('close', (port) => {
                log.debug('socket.on(\'%s\'):', 'close', { id: socket.id, port: port });

                let controller = this.controllers[port];
                if (!controller) {
                    log.warn('No controller found on serial port \'%s\'', port);
                    return;
                }
                controller.close(socket);
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
