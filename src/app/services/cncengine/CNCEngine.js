import noop from 'lodash/noop';
import rangeCheck from 'range_check';
import serialport from 'serialport';
import socketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import ensureArray from '../../lib/ensure-array';
import logger from '../../lib/logger';
import settings from '../../config/settings';
import store from '../../store';
import config from '../configstore';
import taskRunner from '../taskrunner';
import { GrblController, SmoothieController, TinyGController } from '../../controllers';
import { GRBL } from '../../controllers/Grbl/constants';
import { SMOOTHIE } from '../../controllers/Smoothie/constants';
import { TINYG } from '../../controllers/TinyG/constants';
import { IP_WHITELIST } from '../../constants';

const log = logger('service:cncengine');

// Returns true if the specified strings are equal, ignoring case; otherwise, false.
const equals = (s1, s2) => {
    s1 = s1 ? (s1 + '').toUpperCase() : '';
    s2 = s2 ? (s2 + '').toUpperCase() : '';
    return s1 === s2;
};

class CNCEngine {
    controllerClass = {};
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

    // @param {object} server The HTTP server instance.
    // @param {string} controller Specify CNC controller.
    start(server, controller = '') {
        // Grbl
        if (!controller || equals(GRBL, controller)) {
            this.controllerClass[GRBL] = GrblController;
        }
        // Smoothie
        if (!controller || equals(SMOOTHIE, controller)) {
            this.controllerClass[SMOOTHIE] = SmoothieController;
        }
        // TinyG
        if (!controller || equals(TINYG, controller)) {
            this.controllerClass[TINYG] = TinyGController;
        }

        if (Object.keys(this.controllerClass).length === 0) {
            throw new Error(`No valid CNC controller specified (${controller})`);
        }

        log.debug(`Loaded controllers: ${Object.keys(this.controllerClass)}`);

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
            const allowedAccess = IP_WHITELIST.some(whitelist => {
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

            socket.on('startup', (callback) => {
                callback && callback({
                    loadedControllers: Object.keys(this.controllerClass)
                });
            });

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

                // Remove from socket pool
                this.sockets.splice(this.sockets.indexOf(socket), 1);
            });

            // List the available serial ports
            socket.on('list', () => {
                log.debug(`socket.list(): id=${socket.id}`);

                serialport.list((err, ports) => {
                    if (err) {
                        log.error(err);
                        return;
                    }

                    ports = ports.concat(ensureArray(config.get('ports', [])));

                    const controllers = store.get('controllers', {});
                    const portsInUse = Object.keys(controllers)
                        .filter(port => {
                            const controller = controllers[port];
                            return controller && controller.isOpen();
                        });

                    ports = ports.map(port => {
                        return {
                            port: port.comName,
                            manufacturer: port.manufacturer,
                            inuse: portsInUse.indexOf(port.comName) >= 0
                        };
                    });

                    socket.emit('serialport:list', ports);
                });
            });

            // Open serial port
            socket.on('open', (port, options, callback = noop) => {
                if (typeof callback !== 'function') {
                    callback = noop;
                }

                log.debug(`socket.open("${port}", ${JSON.stringify(options)}): id=${socket.id}`);

                let controller = store.get(`controllers["${port}"]`);
                if (!controller) {
                    let { controllerType = GRBL, baudrate } = { ...options };

                    if (controllerType === 'TinyG2') {
                        // TinyG2 is deprecated and will be removed in a future release
                        controllerType = TINYG;
                    }

                    const Controller = this.controllerClass[controllerType];
                    if (!Controller) {
                        const err = `Not supported controller: ${controllerType}`;
                        log.error(err);
                        callback(new Error(err));
                        return;
                    }

                    controller = new Controller(port, { baudrate: baudrate });
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

                    callback(null);
                    return;
                }

                controller.open((err = null) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (store.get(`controllers["${port}"]`)) {
                        log.error(`Serial port "${port}" was not properly closed`);
                    }
                    store.set(`controllers["${port}"]`, controller);

                    // Join the room
                    socket.join(port); // FIXME

                    callback(null);
                });
            });

            // Close serial port
            socket.on('close', (port, callback = noop) => {
                if (typeof callback !== 'function') {
                    callback = noop;
                }

                log.debug(`socket.close("${port}"): id=${socket.id}`);

                const controller = store.get(`controllers["${port}"]`);
                if (!controller) {
                    const err = `Serial port "${port}" not accessible`;
                    log.error(err);
                    callback(new Error(err));
                    return;
                }

                controller.close();

                // Leave the room
                socket.leave(port); // FIXME

                callback(null);
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
