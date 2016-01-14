import _ from 'lodash';
import store from '../store';

export const listAllConnections = (req, res) => {
    const { connection } = store;
    let list = [];

    Object.keys(connection).forEach((port) => {
        let portData = connection[port];
        list.push({
            port: portData.port,
            connected: _.size(portData.sockets),
            ready: portData.ready,
            pending: portData.pending,
            queue: {
                size: portData.queue.size(),
                executed: portData.queue.getExecutedCount(),
                isRunning: portData.queue.isRunning()
            },
            gcode: portData.gcode
        });
    });

    res.send(list);
};
