var _ = require('lodash');
var log = require('./app/lib/log');
var settings = require('./app/config/settings');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var readline = require('readline');
var queue = require('./motion-queue');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var SocketIOFileUpload = require('socketio-file-upload');

var stripComments = (function() {
    var re1 = /^\s+|\s+$/g; // Strip leading and trailing spaces
    var re2 = /\s*[#;].*$/g; // Strip everything after # or ; to the end of the line, including preceding spaces
    return function (s) {
        return s.replace(re1, '').replace(re2, '');
    };
}());

var isCurrentStatusMessage = function(msg) {
    return msg.match(/<(\w+),\w+:([^,]+),([^,]+),([^,]+),\w+:([^,]+),([^,]+),([^,]+)>/);
};

var serialports = {};

module.exports = function(server) {
    var io = require('socket.io')(server, {
        serveClient: true,
        path: '/socket.io'
    });

    io.on('connection', function(socket) {
        log.debug('connection:', { id: socket.id });

        // Create the directory for SocketIOFileUploader
        fse.mkdirsSync(_.get(settings, 'siofu.dir'));

        // Make an instance of SocketIOFileUpload and listen on this socket
        var siofu = new SocketIOFileUpload();
        siofu.dir = _.get(settings, 'siofu.dir');
        siofu.listen(socket);

        siofu.on('saved', function(event){
            log.debug('siofu.saved:', _.pick(event.file, [
                'name',
                'mtime',
                'encoding',
                'clientDetail',
                'meta',
                'id',
                'size',
                'bytesLoaded',
                'success',
                'base',
                'pathName'
            ]));

            if (! event.file.success) {
                log.warn('The uploaded file \'%s\' was not created successfully.', event.file.pathName);
            }

            // Client to Server Meta Data
            var port = _.get(event.file.meta, 'port');

            var pathName = event.file.pathName;
            var data = fs.readFileSync(pathName, 'utf-8');
            var lines = _(data.split('\n'))
                .map(function(line) {
                    return stripComments(line);
                })
                .compact()
                .value();

            // Unlink temporary file
            fs.unlink(pathName, function(err) {
                if (err) {
                    log.error('Unlink of file \'%s\' failed.', pathName, err);
                }
            });

            var sp = serialports[port];
            var executed = 0;
            var total = 0;
            if (sp && sp.queue) {
                executed = sp.queue.size();
                sp.queue.add(lines);
                total = sp.queue.size();
            } 

            // Server to Client Meta Data
            // The meta data will be available to the client on the "complete" event on the client.
            event.file.clientDetail = _.extend({}, event.file.clientDetail, {
                connected: sp && sp.serialPort && sp.serialPort.isOpen(),
                queueStatus: {
                    executed: executed,
                    total: total
                }
            });
        });
            
        siofu.on('error', function(event){
            console.log('siofu.error:', event);
        });

        socket.on('disconnect', function() {
            siofu = undefined;

            // Remove the socket of the disconnected client
            _.each(serialports, function(sp) {
                sp.sockets[socket.id] = undefined;
                delete sp.sockets[socket.id];
            });
            log.debug('disconnect:', { id: socket.id });
        });

        socket.on('list', function() {
            serialport.list(function(err, ports) {
                if (err) {
                    log.error(err);
                    return;
                }

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

                log.info('serialport.list():', ports);
                socket.emit('serialport:list', ports);
            });
        });

        socket.on('open', function(data) {
            var port = _.get(data, 'port');
            var baudrate = Number(_.get(data, 'baudrate')) || 9600; // defaults to 9600
            var sp = serialports[port] = serialports[port] || {
                port: port,
                lastTotal: 0,
                lastExecuted: 0,
                sockets: {
                    // socket.id: { socket: socket, command: command }
                },
                emit: (function(port) {
                    return function(evt, msg) {
                        _.each(sp.sockets, function(o, id) {
                            if (_.isUndefined(o) || (! _.isObject(o.socket))) {
                                log.error('Cannot call method \'emit\' of undefined socket:', { id: id });
                                return;
                            }
                            o.socket.emit(evt, msg);
                        });
                    };
                })(port)
            };

            if ( ! sp.serialPortTimer) {
                sp.serialPortTimer = setInterval(function() {
                    if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
                        return;
                    }

                    // write '?' to the serial port periodically
                    sp.serialPort.write('?');
                }, 250);
            }

            if ( ! sp.queue) {
                sp.queue = queue();
                sp.queue.on('data', function(msg) {
                    var qStatus = sp.queue.status();

                    console.log('[' + qStatus.executed + '/' + qStatus.total + '] ' + msg);

                    msg = ('' + msg).trim();
                    sp.serialPort.write(msg + '\n');
                });
            }

            if ( ! sp.queueTimer) {
                sp.queueTimer = setInterval(function() {
                    if ( ! sp.queue) {
                        return;
                    }

                    var qStatus = sp.queue.status();
                    if (sp.lastTotal === qStatus.total && sp.lastExecuted === qStatus.executed) {
                        return;
                    }

                    sp.lastTotal = qStatus.total;
                    sp.lastExecuted = qStatus.executed;

                    sp.emit('gcode:queue-status', {
                        executed: sp.lastExecuted,
                        total: sp.lastTotal
                    });

                }, 250);
            }

            if ( ! sp.sockets[socket.id]) {
                sp.sockets[socket.id] = {
                    socket: socket,
                    command: ''
                };
            }

            if (sp.serialPort && sp.serialPort.isOpen()) {
                socket.emit('serialport:open', {
                    port: port,
                    baudrate: baudrate,
                    inuse: true
                });
            }

            if ( ! sp.serialPort) {
                try {
                    var serialPort = new SerialPort(port, {
                        baudrate: baudrate,
                        parser: serialport.parsers.readline('\n')
                    });

                    sp.serialPort = serialPort;

                    serialPort.on('open', function() {

                        // Emit 'serialport:open' event to the first connected socket
                        socket.emit('serialport:open', {
                            port: port,
                            baudrate: baudrate,
                            inuse: true
                        });

                        log.debug('Connected to \'%s\' at %d.', port, baudrate);
                    });

                    serialPort.on('data', function(msg) {
                        msg = ('' + msg).trim();

                        if (isCurrentStatusMessage(msg)) {
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
                                    o.socket.emit('serialport:readline', '> ' + msg);
                                }
                            });

                            return;
                        }

                        if (msg.indexOf('ok') === 0) {
                            sp.queue.next();
                            return;
                        }
                        
                        if (msg.indexOf('error') === 0) {
                            log.error(msg);
                            sp.queue.next();
                            return;
                        }

                        if (msg.length > 0) {
                            sp.emit('serialport:readline', '> ' + msg);
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

            log.debug('open:', {
                port: port,
                queued: sp.queue.size(),
                sockets: _.keys(sp.sockets)
            });
        });

        socket.on('close', function(data) {
            var port = _.get(data, 'port');
            var sp = serialports[port] || {};
            if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
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
            var sp = serialports[port] || {};
            if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            log.debug('serialport:write:', { id: socket.id, port: port, msg: msg });

            sp.serialPort.write(msg);
            sp.sockets[socket.id].command = msg;
        });

        socket.on('serialport:writeline', function(port, msg) {
            var sp = serialports[port] || {};
            if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            log.debug('serialport:writeline:', { id: socket.id, port: port, msg: msg });

            msg = ('' + msg).trim();
            if (msg !== '?') { // no newline for the current status command
                msg += '\n';
            }

            sp.serialPort.write(msg);
            sp.sockets[socket.id].command = msg;
        });

        socket.on('gcode:run', function(port) {
            var sp = serialports[port] || {};
            if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            sp.queue.run();
        });

        socket.on('gcode:pause', function(port) {
            var sp = serialports[port] || {};
            if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            sp.queue.pause();
        });

        socket.on('gcode:stop', function(port) {
            var sp = serialports[port] || {};
            if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            sp.queue.stop();
        });

        socket.on('gcode:close', function(port) {
            var sp = serialports[port] || {};
            if ( ! (sp.serialPort && sp.serialPort.isOpen())) {
                log.warn('The serial port is not open.', { port: port });
                return;
            }

            sp.queue.clear();
        });

    });
};
