import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import controller from '@app/lib/controller';
import { Workspace } from '../Workspace';

jest.mock('@app/lib/controller', () => {
  const { EventEmitter } = require('events');
  return Object.assign(new EventEmitter(), { connected: true, workflow: { state: 'idle' } });
});
jest.mock('@app/lib/i18n', () => ({ _: text => text }));
jest.mock('@app/queries/gcode', () => ({ useLoadGCodeMutation: () => ({}) }));
jest.mock('@app/store/config', () => ({ get: () => true, set: jest.fn() }));
jest.mock('../widget-manager', () => ({ getInactiveWidgets: () => [] }));
jest.mock('../widgetRegistry', () => ({ WIDGET_REGISTRY: {} }));
jest.mock('../useWidgetGroup', () => ({ useWidgetGroup: () => ({ ids: [] }) }));
jest.mock('../useWorkspaceLayout', () => ({ useWorkspaceLayout: () => ({}) }));
jest.mock('../DefaultWidgets', () => () => null);
jest.mock('../PrimaryWidgets', () => () => null);
jest.mock('../SecondaryWidgets', () => () => null);
jest.mock('../modals/FeederPaused', () => ({ title, message }) => <div>{title} {message}</div>);
jest.mock('../modals/FeederWait', () => ({ title, message }) => <div>{title} {message}</div>);
jest.mock('../modals/ServerDisconnectedModal', () => () => <div>Disconnected</div>);
jest.mock('../ServerConnectionWatcher', () => () => <div>Watching</div>);

const connectionEvent = (connected, event) => act(() => {
  controller.connected = connected;
  controller.emit(event);
});

const mount = () => renderAppUI(<Workspace
  location={{ pathname: '/workspace' }}
  primaryWidgetIds={[]}
  secondaryWidgetIds={[]}
  workspaceLayout={{}}
/>);

afterEach(() => {
  expect(controller.listenerCount('disconnect')).toBe(0);
});

test('does not show a disconnect overlay before the first transport event', () => {
  controller.connected = false;
  const { unmount } = mount();
  expect(screen.queryByText('Disconnected')).not.toBeInTheDocument();
  connectionEvent(false, 'connect_error');
  expect(screen.getByText('Disconnected')).toBeInTheDocument();
  expect(screen.getByText('Watching')).toBeInTheDocument();
  connectionEvent(true, 'connect');
  expect(screen.queryByText('Disconnected')).not.toBeInTheDocument();
  expect(screen.queryByText('Watching')).not.toBeInTheDocument();
  unmount();
});

test.each(['M0', '%wait'])('preserves the %s feeder prompt and updates it while disconnected', data => {
  controller.connected = true;
  const { unmount } = mount();
  act(() => controller.emit('feeder:status', { hold: true, holdReason: { data, msg: 'Original prompt' } }));
  expect(screen.getByText(/Original prompt/)).toBeInTheDocument();
  connectionEvent(false, 'disconnect');
  expect(screen.queryByText(/Original prompt/)).not.toBeInTheDocument();
  expect(screen.getByText('Disconnected')).toBeInTheDocument();
  connectionEvent(true, 'connect');
  expect(screen.getByText(/Original prompt/)).toBeInTheDocument();
  connectionEvent(false, 'connect_error');
  act(() => controller.emit('feeder:status', { hold: true, holdReason: { data, msg: 'Updated prompt' } }));
  expect(screen.getByText('Disconnected')).toBeInTheDocument();
  expect(screen.queryByText(/Updated prompt/)).not.toBeInTheDocument();
  connectionEvent(true, 'connect');
  expect(screen.getByText(/Updated prompt/)).toBeInTheDocument();
  connectionEvent(false, 'disconnect');
  act(() => controller.emit('feeder:status', { hold: false }));
  expect(screen.getByText('Disconnected')).toBeInTheDocument();
  connectionEvent(true, 'connect');
  expect(screen.queryByText(/Updated prompt/)).not.toBeInTheDocument();
  unmount();
});
