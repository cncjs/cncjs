import { CONNECTION_TYPE_SERIAL } from '../../../constants/connection';

export const createController = (ControllerClass, options = {}) => {
  const writes = [];
  const controller = new ControllerClass({ io: null }, CONNECTION_TYPE_SERIAL, {
    path: '/dev/null',
    baudRate: 115200,
    rtscts: false,
    ...options,
  });
  controller.connection = {
    isOpen: true,
    write: (data, context) => writes.push({ data, context }),
  };
  return { controller, writes };
};
