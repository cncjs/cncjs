var _ = require('lodash');
var store = require('../store');

module.exports.listAllPorts = function(req, res) {
    var list = [];

    Object.keys(store.ports).forEach(function(port) {
        var portData = store.ports[port];
        list.push({
            port: portData.port,
            connected: _.size(portData.sockets),
            ready: portData.ready,
            pending: portData.pending,
            queue: {
                size: portData.queue.size(),
                executed: portData.queue.executed(),
                isRunning: portData.queue.isRunning()
            },
            gcode: portData.gcode
        });
    });

    res.send(list);
};
