import _ from 'lodash';
import store from '../store';

export const listAllPorts = (req, res) => {
    let list = [];

    Object.keys(store.ports).forEach((port) => {
        let portData = store.ports[port];
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
