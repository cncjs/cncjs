import _ from 'lodash';
import rangeCheck from 'range_check';
import serialport from 'serialport';
import socketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import store from './store';
import log from './lib/log';
import settings from './config/settings';
import { GrblController, TinyG2Controller } from './controllers';

const PREFIX = '[cncserver]';
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
        const io = socketIO(this.server, {
            serveClient: true,
            path: '/socket.io'
        });

        io.use(socketioJwt.authorize({
            secret: 'SECRET', // FIXME
            handshake: true
        }));

        io.use((socket, next) => {
            const address = socket.handshake.address;
            const allowed = _.some(ALLOWED_IP_RANGES, (range) => {
                return rangeCheck.inRange(address, range);
            });

            if (!allowed) {
                log.warn(`${PREFIX} Reject connection from ${address}`);
                next(new Error('You are not allowed on this server!'));
                return;
            }

            next();
        });

        io.on('connection', (socket) => {
            const address = socket.handshake.address;
            const token = socket.decoded_token || {};
            log.debug(`${PREFIX} New connection from ${address}: id=${socket.id}, token.id=${token.id}, token.name=${token.name}`);

            // Add to the socket pool
            this.sockets.push(socket);

            socket.on('disconnect', () => {
                log.debug(`${PREFIX} Disconnected from ${address}: id=${socket.id}, token.id=${token.id}, token.name=${token.name}`);

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
                log.debug(`${PREFIX} socket.list(): id=${socket.id}`);

                serialport.list((err, ports) => {
                    if (err) {
                        log.error(err);
                        return;
                    }

                    ports = ports.concat(_.get(settings, 'cnc.ports') || []);

                    const portsInUse = _(this.controllers)
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
                            inuse: _.includes(portsInUse, port.comName)
                        };
                    });

                    socket.emit('serialport:list', ports);
                });
            });

            // Open serial port
            socket.on('open', (port, options) => {
                log.debug(`${PREFIX} socket.open("${port}", ${JSON.stringify(options)}): id=${socket.id}`);

                let controller = this.controllers[port];
                if (!controller) {
                    const { controllerType = 'Grbl', baudrate } = { ...options };

                    if (controllerType === 'Grbl') {
                        controller = new GrblController(port, { baudrate });
                    } else if (controllerType === 'TinyG2') {
                        controller = new TinyG2Controller(port, { baudrate });
                    } else {
                        throw new Error('Not supported controller: ' + controllerType);
                    }
                }

                controller.addConnection(socket);

                if (controller.isOpen()) {
                    socket.emit('serialport:open', {
                        port: port,
                        baudrate: controller.options.baudrate,
                        controllerType: controller.type,
                        inuse: true
                    });
                    return;
                }

                controller.open();
            });

            // Close serial port
            socket.on('close', (port) => {
                log.debug(`${PREFIX} socket.close("${port}"): id=${socket.id}`);

                const controller = this.controllers[port];
                if (!controller) {
                    log.error(`${PREFIX} Serial port "${port}" not accessible`);
                    return;
                }

                controller.close();
            });

            socket.on('command', (port, cmd, ...args) => {
                log.debug(`${PREFIX} socket.command("${port}", "${cmd}"): id=${socket.id}, args=${JSON.stringify(args)}`);

                const controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error(`${PREFIX} Serial port "${port}" not accessible`);
                    return;
                }

                controller.command.apply(controller, [socket, cmd].concat(args));
            });

            socket.on('write', (port, data) => {
                log.debug(`${PREFIX} socket.write("${port}", "${data}"): id=${socket.id}`);

                const controller = this.controllers[port];
                if (!controller || controller.isClose()) {
                    log.error(`${PREFIX} Serial port "${port}" not accessible`);
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
    const cncServer = new CNCServer(server);
    cncServer.start();
};

export default serverMain;
