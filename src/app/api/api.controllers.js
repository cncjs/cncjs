import store from '../store';

export const get = (req, res) => {
    const list = [];

    const controllers = store.get('controllers');
    Object.keys(controllers).forEach((port) => {
        const controller = controllers[port];
        if (controller) {
            list.push(controller.status);
        }
    });

    res.send(list);
};
