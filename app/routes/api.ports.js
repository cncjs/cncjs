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
            queueTotal: portData.q_total,
            queueExecuted: portData.q_executed,
            gcode: portData.gcode
        });
    });

    res.send(list);
};
