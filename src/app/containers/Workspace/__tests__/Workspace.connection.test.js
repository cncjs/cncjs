/* eslint-env jest */
import React from 'react';
import ReactShallowRenderer from 'react-dom/lib/ReactShallowRenderer';
import controller from 'app/lib/controller';
import Workspace from '../Workspace';
import ServerConnectionWatcher from '../ServerConnectionWatcher';
import FeederPaused from '../modals/FeederPaused';
import FeederWait from '../modals/FeederWait';
import ServerDisconnected from '../modals/ServerDisconnected';
import { MODAL_NONE } from '../constants';

jest.mock('react-router-dom', () => ({ withRouter: (Component) => Component }));
jest.mock('app/lib/controller', () => {
  const EventEmitter = require('events');
  return Object.assign(new EventEmitter(), { connected: true, workflow: {} });
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
    controller.connected = true;
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

  const connectionEvent = (connected, event) => {
    controller.connected = connected;
    controller.emit(event);
  };

  it('renders watcher and dialog as siblings only while disconnected', () => {
    expect(connectionChildren(renderer)).toEqual([]);
    connectionEvent(false, 'disconnect');
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    connectionEvent(false, 'connect_error');
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    connectionEvent(true, 'connect');
    expect(connectionChildren(renderer)).toEqual([]);
    connectionEvent(false, 'disconnect');
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
  });

  it.each(['M0', '%wait'])('clears the %s prompt before disconnect and during disconnect on reconnect', (data) => {
    const hold = { hold: true, holdReason: { data, msg: 'old prompt' } };
    controller.emit('feeder:status', hold);
    expect(connectionChildren(renderer)).toEqual([data === '%wait' ? FeederWait : FeederPaused]);
    connectionEvent(false, 'disconnect');
    expect(workspace.state.modal).toEqual({ name: MODAL_NONE, params: {} });
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    controller.emit('feeder:status', hold);
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    connectionEvent(true, 'connect');
    expect(workspace.state.modal).toEqual({ name: MODAL_NONE, params: {} });
    expect(connectionChildren(renderer)).toEqual([]);
    controller.emit('feeder:status', { hold: true, holdReason: { data, msg: 'new prompt' } });
    expect(connectionChildren(renderer)).toEqual([data === '%wait' ? FeederWait : FeederPaused]);
    controller.emit('feeder:status', { hold: false });
    expect(connectionChildren(renderer)).toEqual([]);
  });

  it('atomically clears queued feeder prompts with connection updates under React 15 batching', () => {
    const updates = jest.spyOn(workspace, 'setState');
    renderer.unstable_batchedUpdates(() => {
      controller.emit('feeder:status', { hold: true, holdReason: { data: 'M0' } });
      connectionEvent(false, 'disconnect');
    });
    expect(updates).toHaveBeenLastCalledWith({ serverDisconnected: true, modal: { name: MODAL_NONE, params: {} } });
    expect(connectionChildren(renderer)).toEqual([ServerConnectionWatcher, ServerDisconnected]);
    renderer.unstable_batchedUpdates(() => {
      controller.emit('feeder:status', { hold: true, holdReason: { err: true, msg: 'offline error' } });
      connectionEvent(true, 'connect');
    });
    expect(updates).toHaveBeenLastCalledWith({ serverDisconnected: false, modal: { name: MODAL_NONE, params: {} } });
    expect(connectionChildren(renderer)).toEqual([]);
    expect(workspace.state.modal).toEqual({ name: MODAL_NONE, params: {} });
  });
});
