/* eslint-env jest */
import { EventEmitter } from 'events';
import { GrblController, MarlinController, SmoothieController, TinyGController } from '..';
import createControllerSocket from '../../services/cncengine/controller-socket';
import ClientController from '../../../app/lib/controller/Controller';
import { createController } from './helpers/createController';

jest.mock('../../services/configstore', () => ({ get: jest.fn() }));
jest.mock('../../lib/logger', () => () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), silly: jest.fn(),
}));

describe.each([
  ['Grbl', GrblController],
  ['Marlin', MarlinController],
  ['Smoothie', SmoothieController],
  ['TinyG', TinyGController],
])('%s feeder socket metadata', (name, Controller) => {
  let controller;
  let socket;
  let client;
  let received;
  const port = '/test/controller';

  beforeEach(() => {
    jest.useFakeTimers();
    ({ controller } = createController(Controller, { port }));
    const clientSocket = Object.assign(new EventEmitter(), { connected: true });
    client = new ClientController({ connect: () => clientSocket });
    client.connect();
    received = jest.fn();
    client.addListener('feeder:status', received);
    socket = { id: 'test', emit: jest.fn((...args) => clientSocket.emit(...args)) };
  });

  afterEach(() => {
    controller.destroy();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('stamps the existing-port snapshot and live notifications without changing status', () => {
    controller.addConnection(createControllerSocket(socket, controller));
    const events = socket.emit.mock.calls;
    const open = events.findIndex(([event]) => event === 'serialport:open');
    const snapshot = events.findIndex(([event]) => event === 'feeder:status');
    expect(open).toBeGreaterThanOrEqual(0);
    expect(snapshot).toBeGreaterThan(open);
    expect(events[snapshot]).toEqual(['feeder:status', controller.feeder.toJSON(), port]);
    expect(client.port).toBe(port);
    expect(received).toHaveBeenCalledWith(controller.feeder.toJSON(), port);
    socket.emit.mockClear();
    controller.feeder.hold({ data: 'M0', msg: 'pause' });
    const held = controller.feeder.toJSON();
    jest.advanceTimersByTime(250);
    expect(socket.emit).toHaveBeenCalledWith('feeder:status', { ...held, changed: false }, port);
    controller.feeder.unhold();
    const released = controller.feeder.toJSON();
    jest.advanceTimersByTime(250);
    expect(socket.emit).toHaveBeenCalledWith('feeder:status', { ...released, changed: false }, port);
    controller.removeConnection(socket);
    socket.emit.mockClear();
    controller.emit('feeder:status', held);
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('sends a fresh snapshot after a newly opened port instead of the pre-open snapshot', async () => {
    const connection = new EventEmitter();
    Object.assign(connection, {
      isOpen: false,
      write: jest.fn(),
      open: (callback) => {
        connection.isOpen = true;
        callback();
      },
    });
    controller.connection = connection;
    controller.initController = jest.fn();
    controller.addConnection(createControllerSocket(socket, controller));
    expect(socket.emit.mock.calls.some(([event]) => event === 'feeder:status')).toBe(false);
    controller.feeder.hold({ data: 'M0' });
    const current = controller.feeder.toJSON();
    await new Promise((resolve) => {
      controller.open(resolve);
    });
    const events = socket.emit.mock.calls;
    const open = events.findIndex(([event]) => event === 'serialport:open');
    const snapshot = events.findIndex(([event]) => event === 'feeder:status');
    expect(open).toBeGreaterThanOrEqual(0);
    expect(snapshot).toBeGreaterThan(open);
    expect(events[snapshot]).toEqual(['feeder:status', current, port]);
    expect(client.port).toBe(port);
    expect(received).toHaveBeenCalledWith(current, port);
  });
});
