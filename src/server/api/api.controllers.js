import controllers from '../store/controllers';

const api = {
  get: (req, res) => {
    const list = [];

    Object.keys(controllers).forEach(ident => {
      const controller = controllers[ident];
      if (controller) {
        list.push(controller.status);
      }
    });

    res.send(list);
  },
};

export default api;
