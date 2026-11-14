import React from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockListeners = {};
let mockSavedCameraPosition;
const mockActions = {
  load: jest.fn(),
  unload: jest.fn(),
  zoomFit: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  panUp: jest.fn(),
  panDown: jest.fn(),
  panLeft: jest.fn(),
  panRight: jest.fn(),
  lookAtCenter: jest.fn(),
  resize: jest.fn(),
  showProbe: jest.fn(),
  updateProbe: jest.fn(),
  hideProbe: jest.fn(),
};
const mockUseVisualizer = jest.fn(() => ({
  actions: mockActions,
  containerRef: jest.fn(),
  isReady: true,
}));
const mockController = {
  addListener: jest.fn((eventName, listener) => {
    mockListeners[eventName] = listener;
  }),
  command: jest.fn(),
  connection: { ident: 'connection' },
  context: {},
  removeListener: jest.fn(),
  settings: {},
  state: {},
  type: '',
  workflow: { state: '' },
};

jest.mock('../useVisualizer', () => ({
  __esModule: true,
  default: (...args) => mockUseVisualizer(...args),
}));
jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(() => Promise.resolve({ data: [] })) },
}));
jest.mock('@app/lib/portal', () => jest.fn());
jest.mock('@app/lib/three/WebGL', () => ({
  isWebGLAvailable: jest.fn(() => true),
}));
jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value, t: value => value },
}));
jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));
jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    set: jest.fn(),
    unset: jest.fn(),
    updater: jest.fn(),
  },
}));
jest.mock('@app/store/redux', () => ({
  __esModule: true,
  default: { dispatch: jest.fn() },
}));

const config = require('@app/store/config').default;
const VisualizerWidget = require('../index').default;

const cameraButton = name => within(screen.getByRole('toolbar', { name: 'Visualizer camera toolbar' }))
  .getByRole('button', { name, exact: true });

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockListeners).forEach(eventName => delete mockListeners[eventName]);
  mockSavedCameraPosition = undefined;
  mockController.context = {};
  config.get.mockImplementation((path, defaultValue) => {
    if (path === 'workspace.machineProfile') {
      return null;
    }
    if (Array.isArray(path) && path.join('.') === 'widgets.visualizer.cameraPosition') {
      return mockSavedCameraPosition === undefined ? defaultValue : mockSavedCameraPosition;
    }
    if (Array.isArray(path) && path.join('.') === 'widgets.visualizer') {
      return { cameraPosition: mockSavedCameraPosition };
    }
    return defaultValue;
  });
  config.set.mockImplementation((path, value) => {
    if (Array.isArray(path) && path.join('.') === 'widgets.visualizer.cameraPosition') {
      mockSavedCameraPosition = value;
    }
  });
});

test('restores a saved Front view in the toolbar and visualizer state', () => {
  mockSavedCameraPosition = 'front';
  const { dispose } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

  expect(cameraButton('Front View')).toHaveAttribute('aria-pressed', 'true');
  expect(cameraButton('Top View')).toHaveAttribute('aria-pressed', 'false');
  expect(mockUseVisualizer.mock.calls.at(-1)[0].viewState.cameraPosition).toBe('front');
  dispose();
});

test('normalizes an unknown saved view to Top', () => {
  mockSavedCameraPosition = 'sideways';
  const { dispose } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

  expect(cameraButton('Top View')).toHaveAttribute('aria-pressed', 'true');
  expect(cameraButton('Front View')).toHaveAttribute('aria-pressed', 'false');
  expect(mockUseVisualizer.mock.calls.at(-1)[0].viewState.cameraPosition).toBe('top');
  expect(config.set).toHaveBeenCalledWith(['widgets', 'visualizer', 'cameraPosition'], 'top');
  dispose();
});

test('persists Left and retains it when the connection closes', () => {
  const { dispose } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

  fireEvent.click(cameraButton('Left Side View'));
  expect(cameraButton('Left Side View')).toHaveAttribute('aria-pressed', 'true');
  expect(config.set).toHaveBeenCalledWith(['widgets', 'visualizer', 'cameraPosition'], 'left');
  expect(mockSavedCameraPosition).toBe('left');

  act(() => mockListeners['connection:change']('closed', false));

  expect(cameraButton('Left Side View')).toHaveAttribute('aria-pressed', 'true');
  expect(cameraButton('Top View')).toHaveAttribute('aria-pressed', 'false');
  expect(mockUseVisualizer.mock.calls.at(-1)[0].viewState.cameraPosition).toBe('left');
  expect(mockSavedCameraPosition).toBe('left');
  dispose();
});
