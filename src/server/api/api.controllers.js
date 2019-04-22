import controllers from '../store/controllers';

export const get = (req, res) => {
    const list = [];

    Object.keys(controllers).forEach(ident => {
        const controller = controllers[ident];
        if (controller) {
            list.push(controller.status);
        }
    });

    res.send(list);
};
