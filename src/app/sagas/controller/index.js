import _get from 'lodash/get';
import _noop from 'lodash/noop';
import { call, takeLatest } from 'redux-saga/effects';
import * as CONNECTION from 'app/actions/connection';
import * as CONTROLLER from 'app/actions/controller';
import * as SERIALPORT from 'app/actions/serialport';
import {
  CONNECTION_TYPE_SERIAL,
  CONNECTION_TYPE_SOCKET,
  CONNECTION_STATE_CONNECTED,
  CONNECTION_STATE_DISCONNECTED,
} from 'app/constants/connection';
import controller from 'app/lib/controller';
import x from 'app/lib/json-stringify';
import log from 'app/lib/log';
import reduxStore from 'app/store/redux';

export function* init() {
  /**
     * connection
     */
  controller.addListener('connection:open', (connectionState) => {
    const { type, ident, options } = { ...connectionState };

    log.debug(`A new connection was established: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

    reduxStore.dispatch({
      type: CONNECTION.UPDATE_CONNECTION,
      payload: {
        error: null,
        state: CONNECTION_STATE_CONNECTED,
        type,
        ident,
        options,
      }
    });
  });

  controller.addListener('connection:error', (connectionState, error) => {
    const { type, ident, options } = { ...connectionState };

    log.debug(`A connection error occurred: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

    if (type === CONNECTION_TYPE_SERIAL) {
      const path = _get(options, 'path');
      log.error(`Error opening serial port: ${path}`);
      log.error(error);
    } else if (type === CONNECTION_TYPE_SOCKET) {
      const host = _get(options, 'host');
      const port = _get(options, 'port');
      log.error(`Error opening socket connection: ${host}:${port}`);
      log.error(error);
    }

    reduxStore.dispatch({
      type: CONNECTION.UPDATE_CONNECTION,
      payload: {
        error,
        state: CONNECTION_STATE_DISCONNECTED,
        type,
        ident,
        options,
      }
    });
  });

  controller.addListener('connection:change', (connectionState, connected) => {
    const { type, ident, options } = { ...connectionState };

    log.debug(`The connection status was changed: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

    if (type === CONNECTION_TYPE_SERIAL) {
      const path = _get(options, 'path');

      reduxStore.dispatch({
        type: SERIALPORT.UPDATE_CONNECTION_STATUS,
        payload: {
          path,
          connected,
        }
      });
    }
  });

  controller.addListener('connection:close', (connectionState) => {
    const { type, ident, options } = { ...connectionState };

    log.debug(`The connection was closed: type=${x(type)}, ident=${x(ident)}, options=${x(options)}`);

    reduxStore.dispatch({
      type: CONNECTION.UPDATE_CONNECTION,
      payload: {
        error: null,
        state: CONNECTION_STATE_DISCONNECTED,
        type,
        ident,
        options,
      }
    });
  });

  /**
     * controller
     */
  controller.addListener('controller:settings', (type, settings) => {
    reduxStore.dispatch({
      type: CONTROLLER.UPDATE_CONTROLLER_SETTINGS,
      payload: { type, settings },
    });
  });

  controller.addListener('controller:state', (type, state) => {
    reduxStore.dispatch({
      type: CONTROLLER.UPDATE_CONTROLLER_STATE,
      payload: { type, state },
    });
  });

  /**
     * feeder
     */
  controller.addListener('feeder:status', (status) => {
    reduxStore.dispatch({
      type: CONTROLLER.UPDATE_FEEDER_STATUS,
      payload: { status },
    });
  });

  /**
     * sender
     */
  controller.addListener('sender:status', (status) => {
    reduxStore.dispatch({
      type: CONTROLLER.UPDATE_SENDER_STATUS,
      payload: { status },
    });
  });

  // TODO: Compute the bounding box from backend controller
  controller.addListener('sender:unload', (status) => {
    const boundingBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };

    reduxStore.dispatch({
      type: CONTROLLER.UPDATE_BOUNDING_BOX,
      payload: { boundingBox },
    });
  });

  /**
     * workflow
     */
  controller.addListener('workflow:state', (state) => {
    reduxStore.dispatch({
      type: CONTROLLER.UPDATE_WORKFLOW_STATE,
      payload: { state },
    });
  });

  yield null;
}

export function* process() {
  yield takeLatest(CONNECTION.OPEN_CONNECTION.REQUEST, openConnection);
  yield takeLatest(CONNECTION.CLOSE_CONNECTION.REQUEST, closeConnection);
}

function* openConnection(action) {
  const controllerType = _get(action.payload, 'controller.type');
  const connectionType = _get(action.payload, 'connection.type');
  const connectionOptions = _get(action.payload, 'connection.options');
  const openConnectionCallback = _noop; // Callback is not required

  yield call({ context: controller, fn: controller.open }, controllerType, connectionType, connectionOptions, openConnectionCallback);
}

function* closeConnection(action) {
  const closeConnectionCallback = _noop; // Callback is not required

  yield call({ context: controller, fn: controller.close }, closeConnectionCallback);
}
