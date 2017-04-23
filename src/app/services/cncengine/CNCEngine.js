import _ from 'lodash';
import rangeCheck from 'range_check';
import serialport from 'serialport';
import socketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import store from '../../store';
import logger from '../../lib/logger';
import settings from '../../config/settings';
import config from '../configstore';
import taskRunner from '../taskrunner';
import { GrblController, SmoothieController, TinyGController } from '../../controllers';
import { IP_WHITELIST } from '../../constants';

const log = logger('[CNCEngine]');

class CNCEngine {
    listener = {
        taskStart: (...args) => {
            this.io.sockets.emit('task:start', ...args);
        },
        taskFinish: (...args) => {
            this.io.sockets.emit('task:finish', ...args);
        },
        taskError: (...args) => {
            this.io.sockets.emit('task:error', ...args);
        },
        configChange: (...args) => {
            this.io.sockets.emit('config:change', ...args);
        }
    };
    server = null;
    io = null;
    sockets = [];

    start(server) {
        this.stop();

        taskRunner.on('start', this.listener.taskStart);
        taskRunner.on('finish', this.listener.taskFinish);
        taskRunner.on('error', this.listener.taskError);
        config.on('change', this.listener.configChange);

        this.server = server;
        this.io = socketIO(this.server, {
            serveClient: true,
            path: '/socket.io'
        });

        this.io.use(socketioJwt.authorize({
            secret: settings.secret,
            handshake: true
        }));

        this.io.use((socket, next) => {
            const clientIp = socket.handshake.address;
            const allowedAccess = _.some(IP_WHITELIST, (whitelist) => {
                return rangeCheck.inRange(clientIp, whitelist);
            }) || (settings.allowRemoteAccess);
            const deniedAccess = !allowedAccess;

            if (deniedAccess) {
                log.warn(`Forbidden: Deny connection from ${clientIp}`);
                next(new Error('You are not allowed on this server!'));
                return;
            }

            next();
        });

        this.io.on('connection', (socket) => {
            const address = socket.handshake.address;
            const token = socket.decoded_token || {};
            log.debug(`New connection from ${address}: id=${socket.id}, token.id=${token.id}, token.name=${token.name}`);

            // Add to the socket pool
            this.sockets.push(socket);

            socket.on('disconnect', () => {
                log.debug(`Disconnected from ${address}: id=${socket.id}, token.id=${token.id}, token.name=${token.name}`);

                const controllers = store.get('controllers', {});
                Object.keys(controllers).forEach(port => {
                    const controller = controllers[port];
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
                log.debug(`socket.list(): id=${socket.id}`);

                serialport.list((err, ports) => {
                    if (err) {
                        log.error(err);
                        return;
                    }

                    ports = ports.concat(_.get(settings, 'cnc.ports') || []);

                    const controllers = store.get('controllers', {});
                    const portsInUse = _(controllers)
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
                log.debug(`socket.open("${port}", ${JSON.stringify(options)}): id=${socket.id}`);

                let controller = store.get(`controllers["${port}"]`);
                if (!controller) {
                    const { controllerType = 'Grbl', baudrate } = { ...options };

                    if (controllerType === 'Grbl') {
                        controller = new GrblController(port, { baudrate });
                    } else if (controllerType === 'Smoothie') {
                        controller = new SmoothieController(port, { baudrate });
                    } else if (controllerType === 'TinyG' || controllerType === 'TinyG2') {
                        controller = new TinyGController(port, { baudrate });
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

                    // Join the room
                    socket.join(port); // FIXME
                    return;
                }

                controller.open((err = null) => {
                    if (err) {
                        return;
                    }

                    if (store.get(`controllers["${port}"]`)) {
                        log.error(`Serial port "${port}" was not properly closed`);
                    }
                    store.set(`controllers["${port}"]`, controller);

                    // Join the room
                    socket.join(port); // FIXME
                });
            });

            // Close serial port
            socket.on('close', (port) => {
                log.debug(`socket.close("${port}"): id=${socket.id}`);

                const controller = store.get(`controllers["${port}"]`);
                if (!controller) {
                    log.error(`Serial port "${port}" not accessible`);
                    return;
                }

                // Leave the room
                socket.leave(port); // FIXME

                controller.close();
            });

            socket.on('command', (port, cmd, ...args) => {
                log.debug(`socket.command("${port}", "${cmd}"): id=${socket.id}, args=${JSON.stringify(args)}`);

                const controller = store.get(`controllers["${port}"]`);
                if (!controller || controller.isClose()) {
                    log.error(`Serial port "${port}" not accessible`);
                    return;
                }

                controller.command.apply(controller, [socket, cmd].concat(args));
            });

            socket.on('write', (port, data) => {
                log.debug(`socket.write("${port}", "${data}"): id=${socket.id}`);

                const controller = store.get(`controllers["${port}"]`);
                if (!controller || controller.isClose()) {
                    log.error(`Serial port "${port}" not accessible`);
                    return;
                }

                controller.write(socket, data);
            });

            socket.on('writeln', (port, data) => {
                log.debug(`socket.writeln("${port}", "${data}"): id=${socket.id}`);

                const controller = store.get(`controllers["${port}"]`);
                if (!controller || controller.isClose()) {
                    log.error(`Serial port "${port}" not accessible`);
                    return;
                }

                controller.writeln(socket, data);
            });
        });
    }
    stop() {
        if (this.io) {
            this.io.close();
            this.io = null;
        }
        this.sockets = [];
        this.server = null;

        taskRunner.removeListener('start', this.listener.taskStart);
        taskRunner.removeListener('finish', this.listener.taskFinish);
        taskRunner.removeListener('error', this.listener.taskError);
        config.removeListener('change', this.listener.configChange);
    }
}

export default CNCEngine;
