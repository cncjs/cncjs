/* eslint-env jest */
import React from 'react';
import ReactShallowRenderer from 'react-dom/lib/ReactShallowRenderer';
import controller from 'app/lib/controller';
import Workspace from '../Workspace';
import ServerConnectionWatcher from '../ServerConnectionWatcher';
import FeederPaused from '../modals/FeederPaused';
import FeederWait from '../modals/FeederWait';
import ServerDisconnected from '../modals/ServerDisconnected';
import createControllerSocket from '../../../../server/services/cncengine/controller-socket';
import { MODAL_NONE } from '../constants';

jest.mock('react-router-dom', () => ({ withRouter: (Component) => Component }));
jest.mock('app/lib/controller', () => {
  const EventEmitter = require('events');
  const Controller = jest.requireActual('app/lib/controller/Controller').default;
  const socket = Object.assign(new EventEmitter(), { connected: true });
  const client = new Controller({ connect: () => socket });
  client.connect();
  return client;
});
jest.mock('app/store', () => ({ get: jest.fn(), set: jest.fn() }));
jest.mock('app/api', () => ({}));
jest.mock('app/lib/i18n', () => ({ _: (text) => text }));
jest.mock('app/lib/log', () => ({}));
jest.mock('app/components/Buttons', () => ({ Button: 'button', ButtonGroup: 'div', ButtonToolbar: 'div' }));
jest.mock('../WidgetManager', () => ({ getInactiveWidgets: () => [] }));
jest.mock('../DefaultWidgets', () => 'default-widgets');
jest.mock('../PrimaryWidgets', () => 'primary-widgets');
jest.mock('../SecondaryWidgets', () => 'secondary-widgets');
jest.mock('../modals/FeederPaused', () => 'feeder-paused');
jest.mock('../modals/FeederWait', () => 'feeder-wait');
jest.mock('../modals/ServerDisconnected', () => 'server-disconnected');
jest.mock('../index.styl', () => ({}));

const connectionChildren = (renderer) => React.Children.toArray(renderer.getRenderOutput().props.children)
  .filter((child) => [FeederPaused, FeederWait, ServerConnectionWatcher, ServerDisconnected].includes(child.type))
  .map((child) => child.type);

describe('Workspace connection rendering with React 15', () => {
  let renderer;
  let workspace;

  beforeEach(() => {
    // Keep the test on connection state/rendering, without DOM resize or widget setup.
    jest.spyOn(Workspace.prototype, 'componentDidMount').mockImplementation(() => {});
    jest.spyOn(Workspace.prototype, 'componentDidUpdate').mockImplementation(() => {});
    jest.spyOn(Workspace.prototype, 'componentWillUnmount').mockImplementation(() => {});
    controller.socket.connected = true;
    controller.port = '';
    renderer = ReactShallowRenderer.createRenderer();
    renderer.render(<Workspace />);
    workspace = renderer.getMountedInstance();
    workspace.addControllerEvents();
  });

  afterEach(() => {
    workspace.removeControllerEvents();
    renderer.unmount();
    jest.restoreAllMocks();
  });

  const PORT = '/test/current';
  const OLD_PORT = '/test/old';
  const emit = (...args) => controller.socket.emit(...args);
  const attach = (port = PORT) => emit('serialport:open', { port, controllerType: 'Grbl' });
  const feederStatus = (hold, port = PORT, holdReason = { data: 'M0', msg: 'prompt' }) => {
    emit('feeder:status', { hold, holdReason }, port);
  };
  const connectionEvent = (connected, event) => {
    controller.socket.connected = connected;
    emit(event);
  };

  it('renders watcher and dialog as siblings only while disconnected', () => {
    expect(connectionChildren(renderer)).toEqual([]);
    connectionEvent(false, 'disconnect');
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    connectionEvent(false, 'connect_error');
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    connectionEvent(true, 'connect');
    expect(connectionChildren(renderer)).toEqual([]);
  });

  it.each([
    ['pause', { data: 'M0' }, FeederPaused, 'M0 Program Pause'],
    ['wait', { data: '%wait' }, FeederWait, '%wait'],
    ['error', { err: true, msg: 'failure' }, FeederPaused, 'Error'],
  ])('retains the %s prompt but waits for attached-port status after reconnect', (name, reason, modal, title) => {
    attach();
    feederStatus(true, PORT, reason);
    expect(connectionChildren(renderer)).toEqual([modal]);
    expect(workspace.state.modal.params.title).toBe(title);
    const retained = workspace.state.modal;
    connectionEvent(false, 'disconnect');
    expect(workspace.state.modal).toBe(retained);
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    feederStatus(false);
    attach(OLD_PORT);
    expect(workspace.state.modal).toBe(retained);
    connectionEvent(true, 'connect');
    expect(workspace.state.modal).toBe(retained);
    expect(connectionChildren(renderer)).toEqual([]);
    feederStatus(true, PORT, reason); // A socket connection alone has no attachment.
    expect(connectionChildren(renderer)).toEqual([]);
    attach();
    expect(workspace.state.modal).toBe(retained);
    expect(connectionChildren(renderer)).toEqual([]);
    feederStatus(true, PORT, reason);
    expect(connectionChildren(renderer)).toEqual([modal]);
    feederStatus(false);
    expect(connectionChildren(renderer)).toEqual([]);
    expect(workspace.state.modal).toEqual({ name: MODAL_NONE, params: {} });
  });

  it('ignores old-port status and close while invalidating replacement and current-port closure', () => {
    attach(OLD_PORT);
    feederStatus(true, OLD_PORT);
    attach();
    expect(connectionChildren(renderer)).toEqual([]);
    feederStatus(true, OLD_PORT);
    emit('feeder:status', { hold: true }); // Unidentified notifications are not current.
    expect(connectionChildren(renderer)).toEqual([]);
    feederStatus(true);
    expect(connectionChildren(renderer)).toEqual([FeederPaused]);
    feederStatus(false, OLD_PORT);
    emit('serialport:close', { port: OLD_PORT });
    expect(controller.port).toBe(PORT);
    const commands = jest.spyOn(controller.socket, 'emit');
    controller.command('feeder:stop');
    expect(commands).toHaveBeenCalledWith('command', PORT, 'feeder:stop');
    expect(workspace.state.port).toBe(PORT);
    expect(connectionChildren(renderer)).toEqual([FeederPaused]);
    emit('serialport:close', { port: PORT });
    expect(workspace.state.modal).toEqual({ name: MODAL_NONE, params: {} });
    feederStatus(true);
    expect(connectionChildren(renderer)).toEqual([]);
    attach();
    expect(connectionChildren(renderer)).toEqual([]);
    feederStatus(true);
    expect(connectionChildren(renderer)).toEqual([FeederPaused]);
  });

  it('ignores offline events even when disconnect and reconnect share a React 15 batch', () => {
    attach();
    feederStatus(true);
    const retained = workspace.state.modal;
    renderer.unstable_batchedUpdates(() => {
      connectionEvent(false, 'disconnect');
      feederStatus(false);
      attach(OLD_PORT);
      emit('serialport:close', { port: PORT });
      connectionEvent(true, 'connect');
      feederStatus(true); // Still no serial-port attachment on this connection.
    });
    expect(workspace.state.modal).toBe(retained);
    expect(connectionChildren(renderer)).toEqual([]);
  });

  it('accepts only the final current-port status in a batched attach, hold, replacement and release', () => {
    const renders = jest.spyOn(workspace, 'render');
    renderer.unstable_batchedUpdates(() => {
      attach(OLD_PORT);
      feederStatus(true, OLD_PORT);
      attach();
      feederStatus(true, OLD_PORT);
      feederStatus(true);
      feederStatus(false);
    });
    expect(renders).toHaveBeenCalledTimes(1);
    expect(workspace.state.port).toBe(PORT);
    expect(workspace.state.modal).toEqual({ name: MODAL_NONE, params: {} });
    expect(connectionChildren(renderer)).toEqual([]);
    renderer.unstable_batchedUpdates(() => {
      feederStatus(true);
      emit('serialport:close', { port: PORT });
      feederStatus(true);
    });
    expect(connectionChildren(renderer)).toEqual([]);
  });

  it.each([false, true])('handles the actual controller socket attachment order, already open=%s', (alreadyOpen) => {
    const status = { hold: true, holdReason: { data: '%wait' } };
    const server = { options: { port: PORT }, isOpen: () => alreadyOpen, feeder: { toJSON: () => status } };
    const connection = createControllerSocket({ id: 'test', emit }, server);
    renderer.unstable_batchedUpdates(() => {
      if (alreadyOpen) {
        connection.emit('serialport:open', { port: PORT });
      }
      connection.emit('feeder:status', { hold: false });
      if (!alreadyOpen) {
        connection.emit('serialport:open', { port: PORT });
      }
    });
    expect(connectionChildren(renderer)).toEqual(alreadyOpen ? [] : [FeederWait]);
    connection.emit('feeder:status', status);
    expect(connectionChildren(renderer)).toEqual([FeederWait]);
    connection.emit('feeder:status', { hold: false });
    expect(connectionChildren(renderer)).toEqual([]);
  });
});
