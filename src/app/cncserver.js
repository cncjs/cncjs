import _ from 'lodash';
import pubsub from 'pubsub-js';
import rangeCheck from 'range_check';
import serialport from 'serialport';
import socketIO from 'socket.io';
import store from './store';
import log from './lib/log';
import settings from './config/settings';
import GrblController from './controllers/grbl';

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

class CNCServer {
    server = null;
    sockets = [];
    controllers = store.get('controllers');

    constructor(server) {
        this.server = server;

        store.on('change', (state) => {
            this.controllers = _.get(state, 'controllers', {});
        });
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
                log.warn('[cncserver] Reject connection from %s', address);
                next(new Error('You are not allowed on this server!'));
                return;
            }

            next();
        });

        io.on('connection', (socket) => {
            let address = socket.handshake.address;
            log.debug('[cncserver] New connection from %s:', address, { id: socket.id });

            // Add to the socket pool
            this.sockets.push(socket);

            socket.on('disconnect', () => {
                log.debug('[cncserver] socket.disconnect():', { id: socket.id });

                _.each(this.controllers, (controller, port) => {
                    if (!controller) {
                        return;
                    }
                    controller.removeConnection(socket);
                });

                // Remove from the socket pool
                this.sockets.splice(this.sockets.indexOf(socket), 1);
            });

            // Show available serial ports
            socket.on('list', () => {
                log.debug('[cncserver] socket.list():', { id: socket.id });

                serialport.list((err, ports) => {
                    if (err) {
                        log.error(err);
                        return;
                    }

                    ports = ports.concat(_.get(settings, 'cnc.ports') || []);

                    let portsInUse = _(this.controllers)
                        .filter((controller) => {
                            return controller && controller.isOpen();
                        })
                        .map((controller) => {
                            return controller.port;
                        })
                        .value();
                    
                    ports = _.map(ports, (port) => {
                        return {
                            port: port.comName,
                            manufacturer: port.manufacturer,
                            inuse: _.includes(portsInUse, port.comName) ? true : false
                        };
                    });

                    socket.emit('serialport:list', ports);
                });
            });

            // Open serial port
            socket.on('open', (port, baudrate) => {
                log.debug('[cncserver] socket.open("%s", %d):', port, baudrate, { id: socket.id });
                
                let controller = this.controllers[port];
                if (!controller) {
                    controller = new GrblController(port, baudrate);
                }

                if (controller.isOpen()) {
                    controller.addConnection(socket);
                    socket.emit('serialport:open', {
                        port: port,
                        baudrate: baudrate,
                        inuse: true
                    });
                    return;
                }

                controller.open((err) => {
                    if (err) {
                        log.error('[cncserver] Error opening serial port "%s":', port, err);
                        socket.emit('serialport:error', { port: port });
                        return;
                    }

                    // It should default to an undefined value
                    console.assert(_.isUndefined(this.controllers[port]));
                    store.set('controllers["' + port + '"]', controller);

                    controller.addConnection(socket);
                    socket.emit('serialport:open', {
                        port: port,
                        baudrate: baudrate,
                        inuse: true
                    });
                });
            });

            // Close serial port
            socket.on('close', (port) => {
                log.debug('[cncserver] socket.close("%s"):', port, { id: socket.id });

                let controller = this.controllers[port];
                if (!controller) {
                    log.error('[cncserver] Serial port "%s" not accessible', port);
                    return;
                }

                controller.close((err) => {
                    if (err) {
                        log.error('[cncserver] Error closing serial port "%s":', port, err);
                    }
                    store.unset('controllers["' + port + '"]');
                });
            });

            socket.on('command', (port, cmd) => {
                log.debug('[cncserver] socket.command("%s", "%s"):', port, cmd, { id: socket.id });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('[cncserver] Serial port "%s" not accessible', port);
                    return;
                }

                controller.command(socket, cmd);
            });

            socket.on('write', (port, data) => {
                log.debug('[cncserver] socket.write("%s", "%s"):', port, data, { id: socket.id });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('[cncserver] Serial port "%s" not accessible', port);
                    return;
                }

                controller.write(socket, data);
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

module.exports = serverMain; // use `module.exports` instead of `export default`
