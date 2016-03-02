(function(root) {

var cnc = root.cnc;
var CNCController = cnc.CNCController;
var port = '/dev/tty.wchusbserialfa130';
var baudrate = 115200;
var controller = new CNCController(port, baudrate);

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

controller.open();

setInterval(function() {
    controller.write('?');
}, 1000);

})(this);
