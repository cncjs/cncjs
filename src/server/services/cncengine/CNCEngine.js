import { ensureArray } from 'ensure-type';
import noop from 'lodash/noop';
import { SerialPort } from 'serialport';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import EventTrigger from '../../lib/EventTrigger';
import logger from '../../lib/logger';
import settings from '../../config/settings';
import store from '../../store';
import config from '../configstore';
import taskRunner from '../taskrunner';
import monitor from '../monitor';
import {
  GrblController,
  MarlinController,
  SmoothieController,
  TinyGController
} from '../../controllers';
import { GRBL } from '../../controllers/Grbl/constants';
import { MARLIN } from '../../controllers/Marlin/constants';
import { SMOOTHIE } from '../../controllers/Smoothie/constants';
import { G2CORE, TINYG } from '../../controllers/TinyG/constants';
import {
  authorizeIPAddress,
  validateUser
} from '../../access-control';

const log = logger('service:cncengine');

// Case-insensitive equality checker.
// @param {string} str1 First string to check.
// @param {string} str2 Second string to check.
// @return {boolean} True if str1 and str2 are the same string, ignoring case.
const caseInsensitiveEquals = (str1, str2) => {
  str1 = str1 ? (str1 + '').toUpperCase() : '';
  str2 = str2 ? (str2 + '').toUpperCase() : '';
  return str1 === str2;
};

const isValidController = (controller) => (
  // Grbl
  caseInsensitiveEquals(GRBL, controller) ||
    // Marlin
    caseInsensitiveEquals(MARLIN, controller) ||
    // Smoothie
    caseInsensitiveEquals(SMOOTHIE, controller) ||
    // g2core
    caseInsensitiveEquals(G2CORE, controller) ||
    // TinyG
    caseInsensitiveEquals(TINYG, controller)
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
      },
      watchDirectoryChange: (...args) => {
        if (this.io) {
          this.io.emit('watchdir:change', ...args);
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
      if (!controller || caseInsensitiveEquals(GRBL, controller)) {
        this.controllerClass[GRBL] = GrblController;
      }
      // Marlin
      if (!controller || caseInsensitiveEquals(MARLIN, controller)) {
        this.controllerClass[MARLIN] = MarlinController;
      }
      // Smoothie
      if (!controller || caseInsensitiveEquals(SMOOTHIE, controller)) {
        this.controllerClass[SMOOTHIE] = SmoothieController;
      }
      // TinyG / G2core
      if (!controller || caseInsensitiveEquals(G2CORE, controller) || caseInsensitiveEquals(TINYG, controller)) {
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
      monitor.on('change', this.listener.watchDirectoryChange);

      // System Trigger: Startup
      this.event.trigger('startup');

      this.server = server;
      this.io = new SocketIOServer(this.server, {
        serveClient: true,
        path: '/socket.io',

        /*
         * How long a client may go on believing in a link that is gone.
         *
         * socket.io's defaults are 25s between pings and 20s to answer one,
         * so a *silent* loss -- a phone carried out of range, a mini PC
         * unplugged -- took up to 45 seconds to notice. A browser tab can
         * afford that. A pendant showing "Connected" and live coordinates for
         * three quarters of a minute after the machine stopped answering
         * cannot, and it is the one failure that looks exactly like
         * everything being fine.
         *
         * 10 and 8 puts the worst case at 18 seconds. A killed server is
         * still instant either way, because the socket closes.
         *
         * The cost is a packet every ten seconds per client on a LAN, which
         * is nothing next to the status reports already flowing.
         */
        pingInterval: 10000,
        pingTimeout: 8000,
      });

      this.io.use(async (socket, next) => {
        try {
          // IP Address Access Control
          const ipaddr = socket.handshake.address;
          await authorizeIPAddress(ipaddr);

          // Socket.IO v4 carries credentials in `handshake.auth`, but the
          // query string is still read as well: pendants and other third-party
          // clients pass the token that way, and it is also what a URL opened
          // by hand will carry.
          const token = socket.handshake.auth?.token || socket.handshake.query?.token;
          let user = {};
          if (token) {
            user = jwt.verify(token, settings.secret) || {};
          }

          // User Validation
          await validateUser(user);

          // Replaces `socket.decoded_token` from socketio-jwt, which pinned an
          // old jsonwebtoken and spoke the v2 middleware idiom.
          socket.user = user;
        } catch (err) {
          log.warn(err);
          next(err);
          return;
        }

        next();
      });

      this.io.on('connection', (socket) => {
        const address = socket.handshake.address;
        const user = socket.user || {};
        log.debug(`New connection from ${address}: id=${socket.id}, user.id=${user.id}, user.name=${user.name}`);

        // Add to the socket pool
        this.sockets.push(socket);

        socket.emit('startup', {
          loadedControllers: Object.keys(this.controllerClass),

          // User-defined baud rates and ports
          baudrates: ensureArray(config.get('baudrates', [])),
          ports: ensureArray(config.get('ports', []))
        });

        socket.on('disconnect', () => {
          log.debug(`Disconnected from ${address}: id=${socket.id}, user.id=${user.id}, user.name=${user.name}`);

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

          SerialPort.list()
            .then(ports => {
              ports = ports.concat(ensureArray(config.get('ports', [])));

              const controllers = store.get('controllers', {});
              const portsInUse = Object.keys(controllers)
                .filter(port => {
                  const controller = controllers[port];
                  return controller && controller.isOpen();
                });

              ports = ports.map(port => {
                return {
                  port: port.path,
                  manufacturer: port.manufacturer,
                  inuse: portsInUse.indexOf(port.path) >= 0
                };
              });

              socket.emit('serialport:list', ports);
            })
            .catch(err => {
              log.error(err);
            });
        });

        /**
         * Answer immediately, so a client can time the round trip.
         *
         * How long it takes to stop a jog includes getting the word to this
         * process at all, and that is not always nothing: the server is
         * meant to run on a machine of its own with the panel on somebody
         * else's laptop, where releasing a key crosses a network before it
         * reaches the serial port. On the same computer this measures as
         * zero and costs nothing.
         *
         * It answers on the socket that carries the jog commands, because
         * an HTTP request would measure a different connection.
         */
        socket.on('latency', (callback = noop) => {
          if (typeof callback === 'function') {
            callback();
          }
        });

        // Open serial port
        socket.on('open', (port, options, callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("${port}", ${JSON.stringify(options)}): id=${socket.id}`);

          let controller = store.get(`controllers["${port}"]`);

          /*
           * A port that is already open belongs to whoever opened it.
           *
           * Attaching to one is ordinary and stays ordinary -- a second
           * pendant, the old application and a script can all watch the same
           * machine. Asking for *different* settings while attaching is not:
           * the options below are read only when the controller is
           * constructed, so the request used to be dropped on the floor and
           * answered with success. A client would ask for 9600/Marlin, get
           * 115200/Grbl, and have no way to find out.
           *
           * With one client that is a puzzle. With several it is two panels
           * disagreeing about what the machine is, which is the state a
           * pendant must never be in -- reported by Mateusz on 2026-09-23
           * after opening COM1 while COM3 was still running.
           *
           * Said as an error rather than obeyed: re-opening a live port would
           * drop somebody else's connection, possibly mid-job. Close it
           * first, deliberately, or attach on its terms.
           */
          if (controller && controller.isOpen()) {
            const running = controller.options || {};
            const wanted = { ...options };
            const clash = [
              ['controllerType', wanted.controllerType, controller.type],
              ['baudrate', wanted.baudrate, running.baudrate],
            ].find(([, asked, actual]) => (
              asked !== undefined && asked !== null && String(asked) !== String(actual)
            ));

            if (clash) {
              const [setting, asked, actual] = clash;
              log.warn(`socket.open(): serial port "${port}" is already open with `
                + `${setting}=${actual}, refusing ${setting}=${asked}: id=${socket.id}`);

              /*
               * A plain object, not an `Error`.
               *
               * socket.io encodes the callback's arguments as JSON, and an
               * Error has no enumerable properties -- it arrives as `{}`, so
               * every refusal in this file reaches its client as a failure
               * with no reason attached. The panel turns this into a
               * sentence in the operator's own language; it cannot do that
               * with prose, and prose is all an Error would have carried
               * even if it survived.
               */
              callback({
                code: 'port-settings-clash',
                port,
                setting,
                actual: String(actual),
                asked: String(asked),
              });
              return;
            }
          }

          if (!controller) {
            let { controllerType = GRBL, baudrate, rtscts, pin } = { ...options };

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
            controller = new Controller(engine, {
              port: port,
              baudrate: baudrate,
              rtscts: !!rtscts,
              pin,
            });
          }

          controller.addConnection(socket);

          if (controller.isOpen()) {
            // Join the room
            socket.join(port);

            callback(null);
            return;
          }

          controller.open((err = null) => {
            if (err) {
              callback(err);
              return;
            }

            // System Trigger: Open a serial port
            this.event.trigger('port:open');

            if (store.get(`controllers["${port}"]`)) {
              log.error(`Serial port "${port}" was not properly closed`);
            }
            store.set(`controllers[${JSON.stringify(port)}]`, controller);

            // Join the room
            socket.join(port);

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

          // System Trigger: Close a serial port
          this.event.trigger('port:close');

          // Leave the room
          socket.leave(port);

          controller.close(err => {
            // Remove controller from store
            store.unset(`controllers[${JSON.stringify(port)}]`);

            // Destroy controller
            controller.destroy();

            callback(null);
          });
        });

        socket.on('command', (port, cmd, ...args) => {
          log.debug(`socket.command("${port}", "${cmd}"): id=${socket.id}`);

          const controller = store.get(`controllers["${port}"]`);
          if (!controller || controller.isClose()) {
            log.error(`Serial port "${port}" not accessible`);
            return;
          }

          controller.command.apply(controller, [cmd].concat(args));
        });

        socket.on('write', (port, data, context = {}) => {
          log.debug(`socket.write("${port}", "${data}", ${JSON.stringify(context)}): id=${socket.id}`);

          const controller = store.get(`controllers["${port}"]`);
          if (!controller || controller.isClose()) {
            log.error(`Serial port "${port}" not accessible`);
            return;
          }

          controller.write(data, context);
        });

        socket.on('writeln', (port, data, context = {}) => {
          log.debug(`socket.writeln("${port}", "${data}", ${JSON.stringify(context)}): id=${socket.id}`);

          const controller = store.get(`controllers["${port}"]`);
          if (!controller || controller.isClose()) {
            log.error(`Serial port "${port}" not accessible`);
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
      monitor.removeListener('change', this.listener.watchDirectoryChange);
    }
}

export default CNCEngine;
