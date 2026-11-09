import React from 'react';
import { act, screen } from '@testing-library/react';
import { UPDATE_BOUNDING_BOX } from '@app/actions/controller';
import * as WebGL from '@app/lib/three/WebGL';
import { renderAppUI } from '@app/test/render';

const controllerListeners = {};
const mockLoad = jest.fn(() => ({
  bbox: {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 10, y: 10, z: 0 },
  },
}));
const mockActions = {
  load: mockLoad,
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
    controllerListeners[eventName] = listener;
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

// Keep the toolbar's real Query owner while isolating its profile-list transport.
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
  default: {
    _: value => value,
    t: value => value,
  },
}));
jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));
jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn((path, defaultValue) => {
      if (path === 'workspace.machineProfile') {
        return null;
      }
      return defaultValue;
    }),
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

const controller = require('@app/lib/controller').default;
const config = require('@app/store/config').default;
const reduxStore = require('@app/store/redux').default;
const VisualizerWidget = require('../index').default;

describe('VisualizerWidget G-code loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoad.mockImplementation(() => ({
      bbox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 0 },
      },
    }));
    Object.keys(controllerListeners).forEach(eventName => delete controllerListeners[eventName]);
    controller.context = {};
    config.get.mockImplementation((path, defaultValue) => {
      if (path === 'workspace.machineProfile') {
        return null;
      }
      return defaultValue;
    });
    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: true,
    });
  });

  test('passes the file name and G-code string to the ready visualizer synchronously', () => {
    const { unmount } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => {
      controllerListeners['sender:load']({
        name: 'small.gcode',
        content: 'G21\nG90\nM2',
      }, {});
    });

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith({
      name: 'small.gcode',
      content: 'G21\nG90\nM2',
    });
    expect(reduxStore.dispatch).toHaveBeenCalledTimes(1);
    expect(reduxStore.dispatch).toHaveBeenCalledWith({
      type: UPDATE_BOUNDING_BOX,
      payload: { boundingBox: expect.any(Object) },
    });

    unmount();
  });

  test('consumes only the latest pending document once the visualizer is ready', () => {
    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: false,
    });
    const result = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => {
      controllerListeners['sender:load']({ name: 'first.gcode', content: 'G0 X1' }, {});
      controllerListeners['sender:load']({ name: 'latest.gcode', content: 'G0 X2' }, {});
    });

    expect(mockLoad).not.toHaveBeenCalled();
    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: true,
    });
    act(() => result.rerender(<VisualizerWidget widgetId="visualizer" />));

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith({
      name: 'latest.gcode',
      content: 'G0 X2',
    });
    result.unmount();
  });

  test('clears a pending document when unload arrives before readiness', () => {
    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: false,
    });
    const result = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => {
      controllerListeners['sender:load']({ name: 'pending.gcode', content: 'G0 X1' }, {});
      controllerListeners['sender:unload']();
    });

    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: true,
    });
    act(() => result.rerender(<VisualizerWidget widgetId="visualizer" />));

    expect(mockLoad).not.toHaveBeenCalled();
    result.unmount();
  });

  test('marks G-code ready without an engine when WebGL is unavailable', () => {
    WebGL.isWebGLAvailable.mockReturnValue(false);
    const { unmount } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => {
      controllerListeners['sender:load']({ name: 'software.gcode', content: 'G0 X1' }, {});
    });

    expect(mockLoad).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

    WebGL.isWebGLAvailable.mockReturnValue(true);
    unmount();
  });

  test('reports synchronous engine load errors without leaving G-code loading', () => {
    mockLoad.mockImplementation(() => {
      throw new Error('parser failed');
    });
    const { unmount } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => {
      controllerListeners['sender:load']({ name: 'broken.gcode', content: 'bad' }, {});
    });

    expect(screen.getByText('parser failed')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    unmount();
  });

  test('preserves the host and loaded document across 3D disable and enable', () => {
    const result = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => {
      controllerListeners['sender:load']({ name: 'loaded.gcode', content: 'G0 X1' }, {});
    });
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('3D Visualizer')).toBeInTheDocument();

    act(() => screen.getByTitle('Disable 3D View').click());
    expect(screen.getByLabelText('3D Visualizer')).toBeInTheDocument();

    act(() => screen.getByTitle('Enable 3D View').click());
    expect(screen.getByLabelText('3D Visualizer')).toBeInTheDocument();
    expect(mockLoad).toHaveBeenCalledTimes(1);

    result.unmount();
  });

  test('loads G-code while disabled and reloads distinct load events after enabling', () => {
    const result = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => screen.getByTitle('Disable 3D View').click());
    act(() => {
      controllerListeners['sender:load']({ name: 'hidden.gcode', content: 'G0 X1' }, {});
    });

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith({ name: 'hidden.gcode', content: 'G0 X1' });
    expect(controller.context).toMatchObject({
      xmin: 0,
      xmax: 10,
      ymin: 0,
      ymax: 10,
      zmin: 0,
      zmax: 0,
    });
    expect(reduxStore.dispatch).toHaveBeenCalledTimes(1);
    expect(reduxStore.dispatch).toHaveBeenCalledWith({
      type: UPDATE_BOUNDING_BOX,
      payload: {
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 10, y: 10, z: 0 },
        },
      },
    });

    act(() => screen.getByTitle('Enable 3D View').click());
    expect(mockLoad).toHaveBeenCalledTimes(1);

    act(() => {
      controllerListeners['sender:load']({ name: 'hidden.gcode', content: 'G0 X1' }, {});
    });
    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(reduxStore.dispatch).toHaveBeenCalledTimes(2);

    result.unmount();
  });

  test('hides camera actions until the visualizer engine is ready', () => {
    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: false,
    });
    const result = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    expect(screen.queryByRole('button', { name: 'Top View' })).not.toBeInTheDocument();

    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: true,
    });
    act(() => result.rerender(<VisualizerWidget widgetId="visualizer" />));
    expect(screen.getByRole('button', { name: 'Top View' })).toBeInTheDocument();

    result.unmount();
  });
});
