(function(root) {

var cnc = root.cnc;
var CNCController = cnc.CNCController;
var port = '/dev/cu.usbmodemFD121';
var baudrate = 115200;
var controller = new CNCController(port, baudrate);

cnc.controller = controller;

cnc.sendMove = function(cmd) {
    var jog = function(params) {
        params = params || {};
        var s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');
        controller.writeln('G91 G0 ' + s); // relative distance
        controller.writeln('G90'); // absolute distance
    };
    var move = function(params) {
        params = params || {};
        var s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');
        controller.writeln('G0 ' + s);
    };
    var distance = Number($('select[id="select-distance"]').val()) || 0;

    var fn = {
        'G28': function() {
            controller.writeln('G28');
        },
        'G30': function() {
            controller.writeln('G30');
        },
        'X0Y0Z0': function() {
            move({ X: 0, Y: 0, Z: 0 })
        },
        'X0': function() {
            move({ X: 0 });
        },
        'Y0': function() {
            move({ Y: 0 });
        },
        'Z0': function() {
            move({ Z: 0 });
        },
        'X-Y+': function() {
            jog({ X: -distance, Y: distance });
        },
        'X+Y+': function() {
            jog({ X: distance, Y: distance });
        },
        'X-Y-': function() {
            jog({ X: -distance, Y: -distance });
        },
        'X+Y-': function() {
            jog({ X: distance, Y: -distance });
        },
        'X-': function() {
            jog({ X: -distance });
        },
        'X+': function() {
            jog({ X: distance });
        },
        'Y-': function() {
            jog({ Y: -distance });
        },
        'Y+': function() {
            jog({ Y: distance });
        },
        'Z-': function() {
            jog({ Z: -distance });
        },
        'Z+': function() {
            jog({ Z: distance });
        }
    }[cmd];

    fn && fn();
};

controller.on('serialport:list', function(ports) {
    console.log('ports:', ports);
});

controller.on('serialport:open', function(options) {
    var port = options.port;
    var baudrate = options.baudrate;

    console.log('Connected to \'' + port + '\' at ' + baudrate + '.');
});

controller.on('serialport:close', function(options) {
    var port = options.port;

    console.log('Disconnected from \'' + port + '\'.');
});

controller.on('serialport:error', function(options) {
    var port = options.port;

    console.log('Error opening serial port \'' + port + '\'');
});

controller.on('serialport:read', function(data) {
    var style = 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #222; background: #F5F5F5';
    console.log('%cR%c', style, '', data);
});

controller.on('serialport:write', function(data) {
    var style = 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #00529B; background: #BDE5F8';
    console.log('%cW%c', style, '', data);
});

controller.on('grbl:status', function(data) {
    var activeState = data.activeState;
    var machinePos = data.machinePos;
    var workingPos = data.workingPos;

    $('.control-pad .btn').prop('disabled', activeState !== 'Idle');
    $('#active-state').text(activeState);
    $('#mpos-x').text(machinePos.x);
    $('#mpos-y').text(machinePos.y);
    $('#mpos-z').text(machinePos.z);
    $('#wpos-x').text(workingPos.x);
    $('#wpos-y').text(workingPos.y);
    $('#wpos-z').text(workingPos.z);
});

$('#btn-dropdown').dropdown();
$('#active-state').text('Not connected');
$('#select-distance').val('1');

controller.open();

})(this);
