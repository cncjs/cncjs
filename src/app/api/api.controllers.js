import _ from 'lodash';
import store from '../store';

export const getActiveControllers = (req, res) => {
    let list = [];

    const controllers = store.get('controllers');
    Object.keys(controllers).forEach((port) => {
        const controller = controllers[port];
        if (controller) {
            const data = controller.getData();
            list.push(data);
        }
    });

    res.send(list);
};
