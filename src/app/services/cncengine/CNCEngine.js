import noop from 'lodash/noop';
import rangeCheck from 'range_check';
import SerialPort from 'serialport';
import socketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import settings from '../../config/settings';
import { IP_WHITELIST } from '../../constants';
import EventTrigger from '../../lib/EventTrigger';
import ensureArray from '../../lib/ensure-array';
import logger from '../../lib/logger';
import { toIdent as toSerialIdent } from '../../lib/SerialConnection';
import { toIdent as toSocketIdent } from '../../lib/SocketConnection';
import { GrblController, SmoothieController, TinyGController } from '../../controllers';
import { GRBL } from '../../controllers/Grbl/constants';
import { SMOOTHIE } from '../../controllers/Smoothie/constants';
import { G2CORE, TINYG } from '../../controllers/TinyG/constants';
import controllers from '../../store/controllers';
import config from '../configstore';
import taskRunner from '../taskrunner';

const log = logger('service:cncengine');

// Returns true if the specified strings are equal, ignoring case; otherwise, false.
const equals = (s1, s2) => {
    s1 = s1 ? (s1 + '').toUpperCase() : '';
    s2 = s2 ? (s2 + '').toUpperCase() : '';
    return s1 === s2;
};

const isValidController = (controller) => (
    // Grbl
    equals(GRBL, controller) ||
    // Smoothie
    equals(SMOOTHIE, controller) ||
    // g2core
    equals(G2CORE, controller) ||
    // TinyG
    equals(TINYG, controller)
);

class CNCEngine {
    controllerClass = {};
    listener = {
        taskStart: (...args) => {
            if (this.io) {
                this.io.emit('task:start', ...args);
            }
        },
        taskFinish: (...args) => {
            if (this.io) {
                this.io.emit('task:finish', ...args);
            }
        },
        taskError: (...args) => {
            if (this.io) {
                this.io.emit('task:error', ...args);
            }
        },
        configChange: (...args) => {
            if (this.io) {
                this.io.emit('config:change', ...args);
            }
        }
    };
    server = null;
    io = null;
    sockets = [];

    // Event Trigger
    event = new EventTrigger((event, trigger, commands) => {
        log.debug(`EventTrigger: event="${event}", trigger="${trigger}", commands="${commands}"`);
        if (trigger === 'system') {
            taskRunner.run(commands);
        }
    });

    // @param {object} server The HTTP server instance.
    // @param {string} controller Specify CNC controller.
    start(server, controller = '') {
        // Fallback to an empty string if the controller is not valid
        if (!isValidController(controller)) {
            controller = '';
        }

        // Grbl
        if (!controller || equals(GRBL, controller)) {
            this.controllerClass[GRBL] = GrblController;
        }
        // Smoothie
        if (!controller || equals(SMOOTHIE, controller)) {
            this.controllerClass[SMOOTHIE] = SmoothieController;
        }
        // g2core & TinyG
        if (!controller || equals(G2CORE, controller) || equals(TINYG, controller)) {
            this.controllerClass[TINYG] = TinyGController;
        }

        if (Object.keys(this.controllerClass).length === 0) {
            throw new Error(`No valid CNC controller specified (${controller})`);
        }

        const loadedControllers = Object.keys(this.controllerClass);
        log.debug(`Loaded controllers: ${loadedControllers}`);

        this.stop();

        taskRunner.on('start', this.listener.taskStart);
        taskRunner.on('finish', this.listener.taskFinish);
        taskRunner.on('error', this.listener.taskError);
        config.on('change', this.listener.configChange);

        // System Trigger: Startup
        this.event.trigger('startup');

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

            socket.emit('startup', {
                loadedControllers: Object.keys(this.controllerClass),

                // User-defined baud rates
                baudRates: ensureArray(config.get('baudRates', []))
            });

            socket.on('disconnect', () => {
                log.debug(`Disconnected from ${address}: id=${socket.id}, token.id=${token.id}, token.name=${token.name}`);

                Object.keys(controllers).forEach(ident => {
                    const controller = controllers[ident];
                    if (!controller) {
                        return;
                    }
                    controller.removeSocket(socket);
                });

                // Remove from socket pool
                this.sockets.splice(this.sockets.indexOf(socket), 1);
            });

            // Get a list of available serial ports
            socket.on('getPorts', async () => {
                log.debug(`socket.getPorts(): id=${socket.id}`);

                try {
                    const activeControllers = Object.keys(controllers)
                        .filter(ident => {
                            const controller = controllers[ident];
                            return controller && controller.isOpen;
                        });
                    const availablePorts = ensureArray(await SerialPort.list());
                    const customPorts = ensureArray(config.get('ports', []));
                    const ports = [].concat(availablePorts).concat(customPorts)
                        .map(port => {
                            const { comName, manufacturer } = { ...port };
                            return {
                                comName: comName,
                                manufacturer: manufacturer,
                                isOpen: activeControllers.indexOf(comName) >= 0
                            };
                        })
                        .filter(port => !!(port.comName));

                    socket.emit('ports', ports);
                } catch (err) {
                    log.error(err);
                }
            });

            socket.on('open', (controllerType = GRBL, connectionType = 'serial', options, callback = noop) => {
                if (typeof callback !== 'function') {
                    callback = noop;
                }

                options = { ...options };

                log.debug(`socket.open("${controllerType}", "${connectionType}", ${JSON.stringify(options)}): id=${socket.id}`);

                let ident = '';

                if (connectionType === 'serial') {
                    ident = toSerialIdent(options);
                } else if (connectionType === 'socket') {
                    ident = toSocketIdent(options);
                }

                if (!ident) {
                    const err = new Error('Invalid connection identifier');
                    log.error(err);
                    callback(err);
                    return;
                }

                let controller = controllers[ident];
                if (!controller) {
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

                    const engine = this;
                    controller = new Controller(engine, connectionType, options);
                }

                controller.addSocket(socket);

                if (controller.isOpen) {
                    // Join the room
                    socket.join(ident);

                    callback(null, ident);
                    return;
                }

                controller.open((err = null) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // System Trigger: Open connection
                    this.event.trigger('connection:open');

                    if (controllers[ident]) {
                        log.error(`The connection was not properly closed: ident=${ident}`);
                        delete controllers[ident];
                    }
                    controllers[ident] = controller;

                    // Join the room
                    socket.join(ident);

                    callback(null, ident);
                });
            });

            socket.on('close', (ident, callback = noop) => {
                if (typeof callback !== 'function') {
                    callback = noop;
                }

                log.debug(`socket.close("${ident}"): id=${socket.id}`);

                const controller = controllers[ident];
                if (!controller) {
                    log.error(`The connection is not accessible: ident=${ident}`);
                    callback(new Error(`The connection is not accessible: ident=${ident}`));
                    return;
                }

                // System Trigger: Close connection
                this.event.trigger('connection:close');

                // Leave the room
                socket.leave(ident);

                controller.close(() => {
                    // Remove controller from store
                    delete controllers[ident];
                    controllers[ident] = undefined;

                    // Destroy controller
                    controller.destroy();

                    callback();
                });
            });

            socket.on('command', (ident, cmd, ...args) => {
                log.debug(`socket.command("${ident}", "${cmd}"): id=${socket.id}`);

                const controller = controllers[ident];
                if (!controller || controller.isClose) {
                    log.error(`The connection is not accessible: ident=${ident}`);
                    return;
                }

                controller.command.apply(controller, [cmd].concat(args));
            });

            socket.on('write', (ident, data, context = {}) => {
                log.debug(`socket.write("${ident}", "${data}", ${JSON.stringify(context)}): id=${socket.id}`);

                const controller = controllers[ident];
                if (!controller || controller.isClose) {
                    log.error(`The connection is not accessible: ${ident}`);
                    return;
                }

                controller.write(data, context);
            });

            socket.on('writeln', (ident, data, context = {}) => {
                log.debug(`socket.writeln("${ident}", "${data}", ${JSON.stringify(context)}): id=${socket.id}`);

                const controller = controllers[ident];
                if (!controller || controller.isClose) {
                    log.error(`The connection is not accessible: ${ident}`);
                    return;
                }

                controller.writeln(data, context);
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
