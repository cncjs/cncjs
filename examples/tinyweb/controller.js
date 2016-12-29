(function(root) {

// token
var token = '';

try {
    var cnc = JSON.parse(localStorage.getItem('cnc') || {});
    cnc.state = cnc.state || {};
    cnc.state.session = cnc.state.session || {};
    token = cnc.state.session.token || '';
} catch (err) {
    // Ignore error
}

// WebSocket
var socket = root.io.connect('', {
    query: 'token=' + token
});

socket.on('connect', function() {
    $('#loading').remove(); // Remove loading message
    root.cnc.router.init();
    window.location = '#/';
});

socket.on('error', function() {
    socket.destroy();
    window.location = '/'; // Redirect to webroot
});

socket.on('close', function() {
});

// constants
var GRBL = 'Grbl';
var TINYG2 = 'TinyG2';

var CNCController = function() {
    this.callbacks = {
        'config:change': [],
        'task:run': [],
        'task:complete': [],
        'task:error': [],
        'serialport:list': [],
        'serialport:open': [],
        'serialport:close': [],
        'serialport:error': [],
        'serialport:read': [],
        'serialport:write': [],
        'feeder:status': [],
        'sender:status': [],
        'Grbl:state': [],
        'TinyG2:state': []
    };

    port = '';
    baudrate = 0;
    type = '';
    state = {};

    Object.keys(this.callbacks).forEach(function(eventName) {
        socket.on(eventName, function() {
            var args = Array.prototype.slice.call(arguments);

            if (eventName === 'Grbl:state') {
                this.type = GRBL;
                this.state = args[0];
            }
            if (eventName === 'TinyG2:state') {
                this.type = TINYG2;
                this.state = args[0];
            }

            this.callbacks[eventName].forEach(function(callback) {
                callback.apply(callback, args);
            });
        }.bind(this));
    }.bind(this));
};

CNCController.prototype.on = function(eventName, callback) {
    var callbacks = this.callbacks[eventName];
    if (!callbacks) {
        console.error('Undefined event name:', eventName);
        return;
    }
    if (typeof callback === 'function') {
        callbacks.push(callback);
    }
};

CNCController.prototype.off = function(eventName, callback) {
    var callbacks = this.callbacks[eventName];
    if (!callbacks) {
        console.error('Undefined event name:', eventName);
        return;
    }
    if (typeof callback === 'function') {
        callbacks.splice(callbacks.indexOf(callback), 1);
    }
};

CNCController.prototype.openPort = function(port, options) {
    socket.emit('open', port, options);

    this.port = port;
    this.baudrate = baudrate;
};

CNCController.prototype.closePort = function(port) {
    port = port || this.port;

    socket.emit('close', port);

    this.port = '';
    this.baudrate = 0;
};

CNCController.prototype.listAllPorts = function() {
    socket.emit('list');
};

// @param {string} cmd The command string
// @example Example Usage
// - Load G-code
//   controller.command('load', name, gcode, callback)
// - Unload G-code
//   controller.command('unload')
// - Start sending G-code
//   controller.command('start')
// - Stop sending G-code
//   controller.command('stop')
// - Pause
//   controller.command('pause')
// - Resume
//   controller.command('resume')
// - Feed Hold
//   controller.command('feedhold')
// - Cycle Start
//   controller.command('cyclestart')
// - Reset
//   controller.command('reset')
// - Homing
//   controller.command('homing')
// - Unlock
//   controller.command('unlock')
// - G-code
//   controller.command('gcode', 'G0X0Y0')
// - Load macro
//   controller.command('loadmacro', '<macro-id>', callback)
// - Load file from a watch directory
//   controller.command('loadfile', '/path/to/file', callback)
CNCController.prototype.command = function(cmd) {
    var args = Array.prototype.slice.call(arguments, 1);
    socket.emit.apply(socket, ['command', this.port, cmd].concat(args));
};

CNCController.prototype.write = function(data) {
    socket.emit('write', this.port, data);
};

CNCController.prototype.writeln = function(data) {
    data = ('' + data).trim() + '\n';
    this.write(data);
};

root.cnc.controller = new CNCController();

})(this);
