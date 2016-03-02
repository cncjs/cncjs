(function(root) {

var cnc = root.cnc;
var socket = root.io.connect('');

socket.on('connect', function() {
});
socket.on('error', function() {
    socket.destroy();
});
socket.on('close', function() {
});

cnc.socket = socket;

})(this);
