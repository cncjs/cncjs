/* eslint-env jest */
import MarlinController from '../MarlinController';

describe('MarlinController', () => {
  let controller;

  afterEach(() => {
    if (controller) {
      controller.destroy();
      controller = null;
    }
  });

  describe('command', () => {
    test('homing sends the Marlin auto home command', () => {
      controller = new MarlinController({ io: null }, {
        port: '/dev/null',
        baudrate: 115200,
        rtscts: false,
      });

      const writes = [];
      controller.connection = {
        isOpen: true,
        write: (data) => writes.push(data),
      };

      controller.command('homing');

      expect(writes).toEqual(['G28\n']);
    });
  });
});
