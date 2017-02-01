import _ from 'lodash';
import rangeCheck from 'range_check';
import serialport from 'serialport';
import socketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import store from '../../store';
import log from '../../lib/log';
import settings from '../../config/settings';
import config from '../configstore';
import taskRunner from '../taskrunner';
import { GrblController, SmoothieController, TinyGController } from '../../controllers';
import { IP_WHITELIST } from '../../constants';

const PREFIX = '[cncengine]';

class CNCServer {
    controllers = store.get('controllers');
    listener = {
        taskRun: (...args) => {
            this.io.sockets.emit('task:run', ...args);
        },
        taskError: (...args) => {
            this.io.sockets.emit('task:error', ...args);
        },
        taskComplete: (...args) => {
            this.io.sockets.emit('task:complete', ...args);
        },
        configChange: (...args) => {
            this.io.sockets.emit('config:change', ...args);
        },
        storeChange: (state) => {
            this.controllers = _.get(state, 'controllers', {});
        }
    };
    server = null;
    io = null;
    sockets = [];

    start(server) {
        this.stop();

        taskRunner.on('run', this.listener.taskRun);
        taskRunner.on('error', this.listener.taskError);
        taskRunner.on('complete', this.listener.taskComplete);
        config.on('change', this.listener.configChange);
        store.on('change', this.listener.storeChange);

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
                log.warn(`${PREFIX} Forbidden: Deny connection from ${clientIp}`);
                next(new Error('You are not allowed on this server!'));
                return;
            }

            next();
        });

        this.io.on('connection', (socket) => {
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
                    } else if (controllerType === 'Smoothie') {
                        controller = new SmoothieController(port, { baudrate });
                    } else if (controllerType === 'TinyG') {
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
        if (this.io) {
            this.io.close();
            this.io = null;
        }
        this.sockets = [];
        this.server = null;

        taskRunner.removeListener('run', this.listener.taskRun);
        taskRunner.removeListener('error', this.listener.taskError);
        taskRunner.removeListener('complete', this.listener.taskComplete);
        config.removeListener('change', this.listener.configChange);
        store.removeListener('change', this.listener.storeChange);
    }
}

export default CNCServer;
