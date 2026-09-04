export const createController = (ControllerClass, options = {}) => {
  const writes = [];
  const controller = new ControllerClass({ io: null }, {
    port: '/dev/null',
    baudrate: 115200,
    rtscts: false,
    ...options,
  });
  controller.connection = {
    isOpen: true,
    write: (data, context) => writes.push({ data, context }),
  };
  return { controller, writes };
};
