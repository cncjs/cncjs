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
            gcode: _.pick(controller.gcode, [
                'remain',
                'sent',
                'total',
                'createdTime',
                'startedTime',
                'finishedtime'
            ])
        });
    });

    res.send(list);
};
