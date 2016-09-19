(function(root) {

var cnc = root.cnc || {};
var controller = cnc.controller;

controller.on('serialport:list', function(list) {
    var $el = $('[data-route="connection"] select[data-name="port"]');

    $el.empty();
    $.each(list, function(key, value) {
        var $option = $('<option></option>')
            .attr('value', value.port)
            .attr('data-inuse', value.inuse)
            .text(value.port);
        $el.append($option);
    });

    if (cnc.port) {
        $('[data-route="connection"] select[data-name="port"]').val(cnc.port);
    }
    if (cnc.baudrate) {
        $('[data-route="connection"] select[data-name="baudrate"]').val(cnc.baudrate);
    }

});

controller.on('serialport:open', function(options) {
    var port = options.port;
    var baudrate = options.baudrate;

    console.log('Connected to \'' + port + '\' at ' + baudrate + '.');

    cnc.connected = true;
    cnc.port = port;
    cnc.baudrate = baudrate;

    $('[data-route="workspace"] [data-name="port"]').val(port);

    Cookies.set('cnc.port', port);
    Cookies.set('cnc.baudrate', baudrate);

    root.location = '#/axes';
});

controller.on('serialport:close', function(options) {
    var port = options.port;

    console.log('Disconnected from \'' + port + '\'.');

    cnc.connected = false;
    cnc.port = '';
    cnc.baudrate = 0;

    $('[data-route="workspace"] [data-name="port"]').val('');
    $('[data-route="axes"] [data-name="active-state"]').text('Not connected');

    root.location = '#/connection';
});

controller.on('serialport:error', function(options) {
    var port = options.port;

    console.log('Error opening serial port \'' + port + '\'');

    $('[data-route="connection"] [data-name="msg"]').html('<p style="color: red">Error opening serial port \'' + port + '\'</p>');

});

cnc.sendMove = function(cmd) {
    var jog = function(params) {
        params = params || {};
        var s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');
        controller.command('gcode', 'G91 G0 ' + s); // relative distance
        controller.command('gcode', 'G90'); // absolute distance
    };
    var move = function(params) {
        params = params || {};
        var s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');
        controller.command('gcode', 'G0 ' + s);
    };
    var distance = Number($('[data-route="axes"] select[data-name="select-distance"]').val()) || 0;

    var fn = {
        'G28': function() {
            controller.command('gcode', 'G28');
        },
        'G30': function() {
            controller.command('gcode', 'G30');
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

controller.on('serialport:read', function(data) {
    var style = 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #222; background: #F5F5F5';
    console.log('%cR%c', style, '', data);
});

controller.on('serialport:write', function(data) {
    var style = 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #00529B; background: #BDE5F8';
    console.log('%cW%c', style, '', data);
});

controller.on('Grbl:state', function(data) {
    var status = data.status || {};
    var activeState = status.activeState;
    var machinePosition = status.machinePosition;
    var workPosition = status.workPosition;

    $('[data-route="axes"] .control-pad .btn').prop('disabled', activeState !== 'Idle');
    $('[data-route="axes"] [data-name="active-state"]').text(activeState);
    $('[data-route="axes"] [data-name="mpos-x"]').text(machinePosition.x);
    $('[data-route="axes"] [data-name="mpos-y"]').text(machinePosition.y);
    $('[data-route="axes"] [data-name="mpos-z"]').text(machinePosition.z);
    $('[data-route="axes"] [data-name="wpos-x"]').text(workPosition.x);
    $('[data-route="axes"] [data-name="wpos-y"]').text(workPosition.y);
    $('[data-route="axes"] [data-name="wpos-z"]').text(workPosition.z);
});

controller.listAllPorts();

// Workspace 
$('[data-route="workspace"] [data-name="port"]').val('');
$('[data-route="workspace"] [data-name="btn-close"]').on('click', function() {
    controller.closePort();
});

//
// Connection
//
$('[data-route="connection"] [data-name="btn-open"]').on('click', function() {
    var port = $('[data-route="connection"] [data-name="port"]').val();
    var baudrate = $('[data-route="connection"] [data-name="baudrate"]').val();

    $('[data-route="connection"] [data-name="msg"]').val('');
    controller.openPort(port, { baudrate: Number(baudrate) });
});

//
// Axes
//
$('[data-route="axes"] [data-name="btn-dropdown"]').dropdown();
$('[data-route="axes"] [data-name="active-state"]').text('Not connected');
$('[data-route="axes"] select[data-name="select-distance"]').val('1');

})(this);
