var _ = require('lodash');
var log = require('./app/lib/log');
var settings = require('./app/config/settings');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var parseText = require('gcode-parser').parseText;
var pubsub = require('pubsub-js');
var readline = require('readline');
var queue = require('./command-queue');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;

//
// Grbl 0.9j ['$' for help]
//
var matchGrblInitializationMessage = function(msg) {
    return msg.match(/^Grbl/i);
};

//
// > ?
// <Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>
//
var matchGrblCurrentStatus = function(msg) {
    return msg.match(/<(\w+),\w+:([^,]+),([^,]+),([^,]+),\w+:([^,]+),([^,]+),([^,]+)>/);
};

//
// Example
// > $G
// [G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]
//
var matchGrblGCodeModes = function(msg) {
    return msg.match(/\[(?:\w+[0-9]+\.?[0-9]*\s*)+\]/);
};

var serialports = {};

pubsub.subscribe('file:upload', function(msg, data) {
    var meta = data.meta || {};
    var gcode = data.contents || '';

    parseText(gcode, function(err, data) {
        if (err) {
            log.error('Failed to parse the G-code', err, gcode);
            return;
        }

        var lines = _.pluck(data, 'line');
        var port = meta.port;
        var sp = serialports[port];

        if (!(sp && sp.queue)) {
            log.error('Failed to add %s to the queue: port=%s', JSON.stringify(meta.name), JSON.stringify(port));
            return;
        }

        // Load G-code
        sp.gcode = gcode;

        // Stop and clear queue
        sp.queue.stop();
        sp.queue.clear();

        sp.queue.push(lines);

        log.debug('Added %d lines to the queue: port=%s', lines.length, JSON.stringify(port));
    });
});

module.exports = function(server) {
    var io = require('socket.io')(server, {
        serveClient: true,
        path: '/socket.io'
    });

    io.on('connection', function(socket) {
        log.debug('io.on(%s):', 'connection', { id: socket.id });

        socket.on('disconnect', function() {
            log.debug('socket.on(%s):', 'disconnect', { id: socket.id });

            // Remove the socket of the disconnected client
            _.each(serialports, function(sp) {
                sp.sockets[socket.id] = undefined;
                delete sp.sockets[socket.id];
            });
        });

        socket.on('list', function() {
            log.debug('socket.on(%s):', 'list', { id: socket.id });

            serialport.list(function(err, ports) {
                if (err) {
                    log.error(err);
                    return;
                }

                ports = ports.concat(_.get(settings, 'cnc.ports') || []);

                var portsInUse = _(serialports)
                    .filter(function(sp) {
                        return sp.serialPort && sp.serialPort.isOpen();
                    })
                    .map(function(sp) {
                        return sp.port;
                    })
                    .value();
                
                ports = _.map(ports, function(port) {
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

        socket.on('open', function(port, baudrate) {
            log.debug('socket.on(%s):', 'open', { id: socket.id, port: port, baudrate: baudrate });

            var sp = serialports[port] = serialports[port] || {
                port: port,
                ready: false,
                pending: {
                    '?': false, // current status
                    '$G': false, // view gcode parser state
                    '$G:rsp': false // Grbl response: 'ok' or 'error'
                },
                timer: {},
                serialPort: null,
                gcode: '',
                queue: null,
                q_total: 0,
                q_executed: 0,
                sockets: {
                    // socket.id: { socket: socket, command: command }
                },
                emit: (function() {
                    return function(evt, msg) {
                        _.each(sp.sockets, function(o, id) {
                            if (_.isUndefined(o) || !(_.isObject(o.socket))) {
                                log.error('Cannot call method \'emit\' of undefined socket:', { id: id });
                                return;
                            }
                            o.socket.emit(evt, msg);
                        });
                    };
                })()
            };

            if (!(sp.timer['grbl:query'])) {
                sp.timer['grbl:query'] = setInterval(function() {
                    if (!(sp.serialPort && sp.serialPort.isOpen())) {
                        return;
                    }

                    if (!(sp.ready)) {
                        // The Grbl is not ready
                        return;
                    }

                    if (!(sp.pending['?'])) {
                        sp.pending['?'] = true;
                        sp.serialPort.write('?');
                    }

                    if (!(sp.pending['$G']) && !(sp.pending['$G:rsp'])) {
                        sp.pending['$G'] = true;
                        sp.serialPort.write('$G' + '\n');
                    }

                }, 250);
            }

            if (!(sp.queue)) {
                sp.queue = queue();
                sp.queue.on('data', function(msg) {
                    if (!(sp.serialPort && sp.serialPort.isOpen())) {
                        log.warn('The serial port is not open.', { port: port, msg: msg });
                        return;
                    }

                    var executed = sp.queue.executed();
                    var total = sp.queue.size();

                    log.trace('[' + executed + '/' + total + '] ' + msg);

                    msg = ('' + msg).trim();
                    sp.serialPort.write(msg + '\n');
                });
            }

            if (!(sp.timer['queue'])) {
                sp.timer['queue'] = setInterval(function() {
                    if (!(sp.queue)) {
                        return;
                    }

                    var q_executed = sp.queue.executed();
                    var q_total = sp.queue.size();

                    if (sp.q_total === q_total && sp.q_executed === q_executed) {
                        return;
                    }

                    sp.q_total = q_total;
                    sp.q_executed = q_executed;

                    sp.emit('gcode:queue-status', {
                        executed: sp.q_executed,
                        total: sp.q_total
                    });

                }, 250);
            }

            if (!(sp.sockets[socket.id])) {
                sp.sockets[socket.id] = {
                    socket: socket,
                    command: ''
                };
            }

            if (sp.serialPort && sp.serialPort.isOpen()) {
                // Emit 'serialport:open' event to the connected socket
                socket.emit('serialport:open', {
                    port: port,
                    baudrate: baudrate,
                    inuse: true
                });
            }

            if (!(sp.serialPort)) {
                try {
                    var serialPort = new SerialPort(port, {
                        baudrate: baudrate,
                        parser: serialport.parsers.readline('\n')
                    });

                    sp.serialPort = serialPort;

                    serialPort.on('open', function() {
                        { // Initialization
                            // Set ready to false
                            sp.ready = false;

                            // Set pending commands to false
                            Object.keys(sp.pending).forEach(function(cmd) {
                                sp.pending[cmd] = false;
                            });

                            // Unload G-code
                            sp.gcode = '';

                            // Stop and clear queue
                            sp.queue.stop();
                            sp.queue.clear();
                        }

                        // Emit 'serialport:open' event to the connected socket
                        socket.emit('serialport:open', {
                            port: port,
                            baudrate: baudrate,
                            inuse: true
                        });

                        // Send Ctrl-X to reset Grbl when the serial port connection is established
                        sp.serialPort.write('\x18');

                        log.debug('Connected to \'%s\' at %d.', port, baudrate);
                    });

                    serialPort.on('data', function(msg) {
                        msg = ('' + msg).trim();

                        // Example: Grbl 0.9j ['$' for help]
                        if (matchGrblInitializationMessage(msg)) {
                            // Reset pending commands to false
                            Object.keys(sp.pending).forEach(function(cmd) {
                                sp.pending[cmd] = false;
                            });

                            sp.ready = true;
                        }

                        if (matchGrblCurrentStatus(msg)) {
                            var r = msg.match(/<(\w+),\w+:([^,]+),([^,]+),([^,]+),\w+:([^,]+),([^,]+),([^,]+)>/);
                            // https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.9#---current-status
                            sp.emit('grbl:current-status', {
                                activeState: r[1], // Active States: Idle, Run, Hold, Door, Home, Alarm, Check
                                machinePos: { // Machine position
                                    x: r[2], 
                                    y: r[3],
                                    z: r[4]
                                },
                                workingPos: { // Working position
                                    x: r[5],
                                    y: r[6],
                                    z: r[7]
                                }
                            });

                            _.each(sp.sockets, function(o) {
                                if (o.command === '?') {
                                    o.command = '';
                                    o.socket.emit('serialport:data', msg);
                                }
                            });

                            sp.pending['?'] = false;

                            return;
                        }

                        if (matchGrblGCodeModes(msg)) {
                            var r = msg.match(/\[([^\]]*)\]/);
                            var list = r[1].split(' ');
                            var modes = _(list)
                                .compact()
                                .map(function(cmd) {
                                    return _.trim(cmd);
                                })
                                .value();

                            sp.emit('grbl:gcode-modes', modes);

                            _.each(sp.sockets, function(o) {
                                if (o.command.indexOf('$G') === 0) {
                                    o.socket.emit('serialport:data', msg);
                                }
                            });

                            sp.pending['$G'] = false;
                            sp.pending['$G:rsp'] = true; // Wait for Grbl response

                            return;
                        }

                        if ((msg.indexOf('ok') === 0) || (msg.indexOf('error') === 0)) {
                            if (sp.pending['$G:rsp']) {
                                _.each(sp.sockets, function(o) {
                                    if (o.command.indexOf('$G') === 0) {
                                        o.command = ''; // Clear the command buffer
                                        o.socket.emit('serialport:data', msg);
                                    }
                                });
                                sp.pending['$G:rsp'] = false;
                                return;
                            }

                            if (sp.queue.isRunning()) {
                                sp.queue.next();
                                return;
                            }
                        }

                        if (msg.length > 0) {
                            sp.emit('serialport:data', msg);
                        }
                    });

                    serialPort.on('close', function() {
                        log.debug('The serial port connection is closed.', {
                            port: port
                        });

                        // Emit 'serialport:close' event to all connected sockets
                        sp.emit('serialport:close', {
                            port: port,
                            inuse: false
                        });

                        serialports[port] = undefined;
                        delete serialports[port];
                    });

                    serialPort.on('error', function() {
                        log.error('Error opening serial port \'%s\'', port);

                        // Emit 'serialport:error' event to the first connected socket
                        socket.emit('serialport:error', {
                            port: port
                        });
                    });

                }
                catch (err) {
                    log.error(err);

                    // clear sockets on errors
                    sp.sockets = {};
                }
            }

            log.debug({
                port: port,
                queued: sp.queue.size(),
                sockets: _.keys(sp.sockets)
            });
        });

        socket.on('close', function(port) {
            log.debug('socket.on(%s):', 'close', { id: socket.id, port: port });

            var sp = serialports[port] || {};
            if (!(sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            // Remove socket from the connected port
            sp.sockets[socket.id] = undefined;
            delete sp.sockets[socket.id];

            if (_.size(sp.sockets) === 0) {
                sp.serialPort.close(function(err) {
                    if (err) {
                        log.error('Error opening serial port \'%s\'', port);
                    }
                });

                // Delete serial port
                serialports[port] = undefined;
                delete serialports[port];
            }

            // Emit 'serialport:close' event
            var inuse = _.size(sp.sockets) > 0;
            socket.emit('serialport:close', {
                port: port,
                inuse: inuse
            });

        });

        socket.on('serialport:write', function(port, msg) {
            log.debug('socket.on(%s):', 'serialport:write', { id: socket.id, port: port, msg: msg });

            var sp = serialports[port] || {};
            if (!(sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port, msg: msg });
                return;
            }

            sp.serialPort.write(msg);
            sp.sockets[socket.id].command = msg;
        });

        socket.on('gcode:run', function(port) {
            log.debug('socket.on(%s):', 'gcode:run', { id: socket.id, port: port });

            var sp = serialports[port] || {};
            if (!(sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            sp.queue.play();
        });

        socket.on('gcode:pause', function(port) {
            log.debug('socket.on(%s):', 'gcode:pause', { id: socket.id, port: port });

            var sp = serialports[port] || {};
            if (!(sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            sp.queue.pause();
        });

        socket.on('gcode:stop', function(port) {
            log.debug('socket.on(%s):', 'gcode:stop', { id: socket.id, port: port });

            var sp = serialports[port] || {};
            if (!(sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            sp.queue.stop();
        });

        socket.on('gcode:unload', function(port) {
            log.debug('socket.on(%s):', 'gcode:unload', { id: socket.id, port: port });

            var sp = serialports[port] || {};
            if (!(sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            // Unload G-code
            sp.gcode = '';

            // Clear queue
            sp.queue.clear();
        });

    });
};
