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
            port: controller.options.port,
            baudrate: controller.options.baudrate,
            isOpen: controller.serialport.isOpen(),
            connections: _.size(controller.connections),
            state: controller.state,
            gcode: controller.gcode
        });
    });

    res.send(list);
};
