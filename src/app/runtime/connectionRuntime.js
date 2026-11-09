import {
  CONNECTION_STATE_CONNECTED,
  CONNECTION_STATE_CONNECTING,
  CONNECTION_STATE_DISCONNECTED,
  CONNECTION_STATE_DISCONNECTING,
} from '@app/constants/connection';

const DEFAULT_TIMEOUT_MS = 10000;

const createError = (code, message) => {
  const error = new Error(message || code);
  error.code = code;
  return error;
};

const normalizeConnectionState = (connectionState = {}, snapshot) => ({
  type: connectionState.type || snapshot.type,
  ident: connectionState.ident || snapshot.ident,
  options: Object.prototype.hasOwnProperty.call(connectionState, 'options')
    ? connectionState.options
    : snapshot.options,
});

const createConnectionRuntime = ({
  controller,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) => {
  if (!controller) {
    throw new TypeError('A controller transport is required');
  }

  const listeners = new Set();
  let snapshot = {
    state: CONNECTION_STATE_DISCONNECTED,
    type: 'serial',
    ident: null,
    options: null,
    error: null,
    isOpening: false,
    isClosing: false,
  };
  let activeOperation = null;
  let destroyed = false;

  const notify = () => {
    listeners.forEach(listener => listener());
  };

  const updateSnapshot = (patch) => {
    const next = { ...snapshot, ...patch };
    const changed = Object.keys(next).some(key => !Object.is(next[key], snapshot[key]));
    if (!changed) {
      return;
    }
    snapshot = next;
    notify();
  };

  const clearTimer = (operation) => {
    if (operation?.timer) {
      clearTimeout(operation.timer);
      operation.timer = null;
    }
  };

  const resolveOnce = (operation, value) => {
    if (!operation?.settled) {
      operation.settled = true;
      operation.resolve(value);
    }
  };

  const rejectOnce = (operation, error) => {
    if (!operation?.settled) {
      operation.settled = true;
      operation.reject(error);
    }
  };

  const releaseOperation = (operation) => {
    clearTimer(operation);
    if (activeOperation === operation) {
      activeOperation = null;
    }
  };

  const settleFromOpen = (connectionState = {}) => {
    const operation = activeOperation;
    const state = normalizeConnectionState(connectionState, snapshot);
    if (operation?.type === 'open') {
      resolveOnce(operation, state);
      releaseOperation(operation);
    }
    updateSnapshot({
      ...state,
      state: CONNECTION_STATE_CONNECTED,
      error: null,
      isOpening: false,
      isClosing: operation?.type === 'close',
    });
  };

  const settleFromClose = (connectionState = {}) => {
    const operation = activeOperation;
    const state = normalizeConnectionState(connectionState, snapshot);
    if (operation) {
      if (operation.type === 'open') {
        rejectOnce(operation, createError('CONNECTION_OPERATION_CANCELLED', 'The connection open request did not complete'));
      } else {
        resolveOnce(operation, state);
      }
      releaseOperation(operation);
    }
    updateSnapshot({
      ...state,
      state: CONNECTION_STATE_DISCONNECTED,
      ident: null,
      error: null,
      isOpening: false,
      isClosing: false,
    });
  };

  const settleFromError = (connectionState, error) => {
    const operation = activeOperation;
    const value = error instanceof Error ? error : new Error(error || 'Connection error');
    const state = normalizeConnectionState(connectionState, snapshot);
    if (operation) {
      rejectOnce(operation, value);
      releaseOperation(operation);
    }
    updateSnapshot({
      ...state,
      state: 'error',
      error: value,
      isOpening: false,
      isClosing: false,
    });
  };

  const handleOpen = (connectionState) => {
    settleFromOpen(connectionState);
  };

  const handleClose = (connectionState) => {
    settleFromClose(connectionState);
  };

  const handleChange = (connectionState, connected) => {
    if (connected) {
      settleFromOpen(connectionState);
      return;
    }
    settleFromClose(connectionState);
  };

  const handleError = (connectionState, error) => {
    settleFromError(connectionState, error);
  };

  const handleDisconnect = () => {
    const operation = activeOperation;
    if (operation) {
      rejectOnce(operation, createError(
        'CONNECTION_TRANSPORT_DISCONNECTED',
        'The Socket.IO connection disconnected during a connection operation',
      ));
      releaseOperation(operation);
    }
    updateSnapshot({
      state: CONNECTION_STATE_DISCONNECTED,
      ident: null,
      error: null,
      isOpening: false,
      isClosing: false,
    });
  };

  const beginOperation = (type) => {
    if (destroyed) {
      return Promise.reject(createError('CONNECTION_RUNTIME_DESTROYED', 'Connection runtime was destroyed'));
    }
    if (activeOperation) {
      return Promise.reject(createError('CONNECTION_OPERATION_PENDING', 'A connection operation is still pending server confirmation'));
    }
    const operation = {
      type,
      timer: null,
      settled: false,
      resolve: null,
      reject: null,
    };
    activeOperation = operation;
    const promise = new Promise((resolve, reject) => {
      operation.resolve = resolve;
      operation.reject = reject;
    });
    operation.timer = setTimeout(() => {
      if (activeOperation !== operation) {
        return;
      }
      const error = createError('CONNECTION_OPERATION_TIMEOUT', `The connection ${type} request timed out`);
      rejectOnce(operation, error);
      clearTimer(operation);
      updateSnapshot({
        state: 'error',
        error,
        isOpening: type === 'open',
        isClosing: type === 'close',
      });
    }, timeoutMs);
    return { operation, promise };
  };

  const open = (request = {}) => {
    const started = beginOperation('open');
    if (started instanceof Promise) {
      return started;
    }
    const { operation, promise } = started;
    const controllerType = request.controller?.type;
    const connectionType = request.connection?.type;
    const connectionOptions = request.connection?.options;
    updateSnapshot({
      state: CONNECTION_STATE_CONNECTING,
      type: connectionType || snapshot.type,
      ident: null,
      options: connectionOptions || null,
      error: null,
      isOpening: true,
      isClosing: false,
    });
    controller.open(controllerType, connectionType, connectionOptions, (error, connectionState) => {
      if (activeOperation !== operation) {
        return;
      }
      if (error) {
        settleFromError(connectionState, error);
        return;
      }
      settleFromOpen(connectionState);
    });
    return promise;
  };

  const close = () => {
    if (!snapshot.ident) {
      return Promise.reject(createError('CONNECTION_NOT_OPEN', 'No connection is open'));
    }
    const started = beginOperation('close');
    if (started instanceof Promise) {
      return started;
    }
    const { operation, promise } = started;
    updateSnapshot({
      state: CONNECTION_STATE_DISCONNECTING,
      error: null,
      isOpening: false,
      isClosing: true,
    });
    controller.close((error, connectionState) => {
      if (activeOperation !== operation) {
        return;
      }
      if (error) {
        settleFromError(connectionState, error);
        return;
      }
      settleFromClose(connectionState);
    });
    return promise;
  };

  const command = (cmd, ...args) => {
    if (!snapshot.ident) {
      return;
    }
    controller.command(cmd, ...args);
  };

  const write = (data, context) => {
    if (!snapshot.ident) {
      return;
    }
    controller.write(data, context);
  };

  const writeln = (data, context) => {
    if (!snapshot.ident) {
      return;
    }
    controller.writeln(data, context);
  };

  const subscriptions = [
    ['connection:open', handleOpen],
    ['connection:close', handleClose],
    ['connection:change', handleChange],
    ['connection:error', handleError],
    ['disconnect', handleDisconnect],
  ];
  subscriptions.forEach(([eventName, listener]) => {
    controller.addListener?.(eventName, listener);
  });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') {
        return () => {};
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open,
    close,
    command,
    write,
    writeln,
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      if (activeOperation) {
        rejectOnce(activeOperation, createError('CONNECTION_RUNTIME_DESTROYED', 'Connection runtime was destroyed'));
        releaseOperation(activeOperation);
      }
      subscriptions.forEach(([eventName, listener]) => controller.removeListener?.(eventName, listener));
      listeners.clear();
    },
  };
};

export default createConnectionRuntime;
