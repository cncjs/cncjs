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

pubsub.subscribe('file:upload', (msg, data) => {
    let meta = data.meta || {};
    let port = meta.port;
    let controller = store.get('controllers["' + port + '"]');

    if (!controller) {
        log.error('The controller is undefined', { meta: meta });
        return;
    }

    let gcode = data.contents || '';

    // Load new G-code
    controller.gcode_load(gcode, (err) => {
        if (err) {
            log.error('Failed to parse the G-code', err, gcode);
        }
    });
});

class CNCServer {
    server = null;
    sockets = [];
    controllers = store.get('controllers');

    constructor(server) {
        this.server = server;

        store.on('change', (state) => {
            log.debug('store.on(\'change\'):', state);
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
                    if (!controller) {
                        return;
                    }
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

                    log.debug('serialport.list():', ports);
                    socket.emit('serialport:list', ports);
                });
            });

            // Open serial port
            socket.on('open', (port, baudrate) => {
                log.debug('socket.on(\'%s\'):', 'open', { id: socket.id, port: port, baudrate: baudrate });
                
                let controller = this.controllers[port];
                if (!controller) {
                    controller = new GrblController(port, baudrate);
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
                        log.error('Error opening serial port \'%s\':', port, err);
                        socket.emit('serialport:error', { port: port });
                        return;
                    }

                    // It should default to an undefined value
                    console.assert(_.isUndefined(this.controllers[port]));
                    store.set('controllers["' + port + '"]', controller);

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
                    log.error('Serial port not accessible:', { port: port });
                    return;
                }

                controller.close((err) => {
                    if (err) {
                        log.error('Error closing serial port \'%s\':', port, err);
                    }
                    store.unset('controllers["' + port + '"]');
                });
            });

            socket.on('serialport:write', (port, cmd) => {
                log.debug('socket.on(%s):', 'serialport:write', { id: socket.id, port: port, cmd: cmd });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('Serial port not accessible:', { port: port });
                    return;
                }

                controller.command(cmd);
            });

            socket.on('gcode:start', (port) => {
                log.debug('socket.on(%s):', 'gcode:start', { id: socket.id, port: port });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('Serial port not accessible:', { port: port });
                    return;
                }

                controller.gcode_start();
            });

            socket.on('gcode:resume', (port) => {
                log.debug('socket.on(%s):', 'gcode:resume', { id: socket.id, port: port });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('Serial port not accessible:', { port: port });
                    return;
                }

                controller.gcode_resume();
            });

            socket.on('gcode:pause', (port) => {
                log.debug('socket.on(%s):', 'gcode:pause', { id: socket.id, port: port });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('Serial port not accessible:', { port: port });
                    return;
                }

                controller.gcode_pause();
            });

            socket.on('gcode:stop', (port) => {
                log.debug('socket.on(%s):', 'gcode:stop', { id: socket.id, port: port });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('Serial port not accessible:', { port: port });
                    return;
                }

                controller.gcode_stop();
            });

            socket.on('gcode:unload', (port) => {
                log.debug('socket.on(%s):', 'gcode:unload', { id: socket.id, port: port });

                let controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error('Serial port not accessible:', { port: port });
                    return;
                }

                controller.gcode_unload();
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
