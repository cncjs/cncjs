import _ from 'lodash';
import store from '../store';

export const getActiveControllers = (req, res) => {
    let list = [];
    let controllers = store.get('controllers');

    Object.keys(controllers).forEach((port) => {
        let controller = controllers[port];
        if (!controller) {
            return;
        }

        list.push({
            port: controller.serialport.path,
            baudrate: controller.serialport.options.baudRate,
            isOpen: controller.serialport.isOpen(),
            connected: _.size(controller.sockets),
            queue: {
                size: controller.queue.size(),
                executed: controller.queue.getExecutedCount(),
                isRunning: controller.queue.isRunning()
            },
            gcode: controller.gcode
        });
    });

    res.send(list);
};
