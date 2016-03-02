(function(root) {

var socket = root.io.connect('');

socket.on('connect', function() {
});
socket.on('error', function() {
    socket.destroy();
});
socket.on('close', function() {
});

root.socket = socket;

})(this);
