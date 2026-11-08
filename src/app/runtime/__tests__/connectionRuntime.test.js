/* eslint-env jest */
import createConnectionRuntime from '../connectionRuntime';

const createController = () => {
  const listeners = new Map();
  const controller = {
    addListener: jest.fn((eventName, listener) => {
      const eventListeners = listeners.get(eventName) || [];
      eventListeners.push(listener);
      listeners.set(eventName, eventListeners);
    }),
    removeListener: jest.fn((eventName, listener) => {
      const eventListeners = listeners.get(eventName) || [];
      listeners.set(eventName, eventListeners.filter(item => item !== listener));
    }),
    open: jest.fn(),
    close: jest.fn(),
    command: jest.fn(),
    write: jest.fn(),
    writeln: jest.fn(),
    emit(eventName, ...args) {
      (listeners.get(eventName) || []).forEach(listener => listener(...args));
    },
  };
  return controller;
};

const request = {
  controller: { type: 'grbl' },
  connection: {
    type: 'serial',
    options: { path: '/dev/ttyUSB0', baudRate: 115200 },
  },
};

const connectionState = {
  type: 'serial',
  ident: 'serial:/dev/ttyUSB0',
  options: request.connection.options,
};

describe('connection runtime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('keeps a late global open event authoritative after the local open times out', async () => {
    const controller = createController();
    const runtime = createConnectionRuntime({ controller, timeoutMs: 100 });

    const openPromise = runtime.open(request);

    expect(controller.open).toHaveBeenCalledWith(
      'grbl',
      'serial',
      request.connection.options,
      expect.any(Function),
    );

    jest.advanceTimersByTime(100);
    await expect(openPromise).rejects.toMatchObject({ code: 'CONNECTION_OPERATION_TIMEOUT' });
    expect(runtime.getSnapshot()).toEqual(expect.objectContaining({
      state: 'error',
      error: expect.objectContaining({ code: 'CONNECTION_OPERATION_TIMEOUT' }),
      isOpening: true,
    }));

    controller.emit('connection:open', connectionState);

    expect(runtime.getSnapshot()).toEqual(expect.objectContaining({
      state: 'connected',
      ident: 'serial:/dev/ttyUSB0',
      error: null,
      isOpening: false,
    }));
  });

  test('rejects a second local open while the first request is unconfirmed', async () => {
    const controller = createController();
    const runtime = createConnectionRuntime({ controller, timeoutMs: 100 });

    const firstOpen = runtime.open(request);

    await expect(runtime.open(request)).rejects.toMatchObject({
      code: 'CONNECTION_OPERATION_PENDING',
    });
    expect(controller.open).toHaveBeenCalledTimes(1);

    controller.emit('connection:error', connectionState, 'Port is busy');
    await expect(firstOpen).rejects.toThrow('Port is busy');

    runtime.open(request);
    expect(controller.open).toHaveBeenCalledTimes(2);
  });

  test('keeps a late global close event authoritative after the local close times out', async () => {
    const controller = createController();
    const runtime = createConnectionRuntime({ controller, timeoutMs: 100 });
    controller.emit('connection:open', connectionState);

    const closePromise = runtime.close();

    expect(controller.close).toHaveBeenCalledWith(expect.any(Function));

    jest.advanceTimersByTime(100);
    await expect(closePromise).rejects.toMatchObject({ code: 'CONNECTION_OPERATION_TIMEOUT' });
    expect(runtime.getSnapshot()).toEqual(expect.objectContaining({
      state: 'error',
      isClosing: true,
    }));

    controller.emit('connection:close', connectionState);

    expect(runtime.getSnapshot()).toEqual(expect.objectContaining({
      state: 'disconnected',
      ident: null,
      isClosing: false,
    }));
  });

  test('releases a pending request when Socket.IO disconnects', async () => {
    const controller = createController();
    const runtime = createConnectionRuntime({ controller, timeoutMs: 100 });
    const openPromise = runtime.open(request);

    controller.emit('disconnect');

    await expect(openPromise).rejects.toMatchObject({
      code: 'CONNECTION_TRANSPORT_DISCONNECTED',
    });
    runtime.open(request);
    expect(controller.open).toHaveBeenCalledTimes(2);
  });

  test('delegates commands through the existing controller transport', () => {
    const controller = createController();
    const runtime = createConnectionRuntime({ controller });
    controller.emit('connection:open', connectionState);

    runtime.command('feed_hold');
    runtime.write('G0 X0', { source: 'test' });
    runtime.writeln('G0 Y0');

    expect(controller.command).toHaveBeenCalledWith('feed_hold');
    expect(controller.write).toHaveBeenCalledWith('G0 X0', { source: 'test' });
    expect(controller.writeln).toHaveBeenCalledWith('G0 Y0', undefined);
  });
});
