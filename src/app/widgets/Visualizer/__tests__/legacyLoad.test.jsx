import React from 'react';
import { act } from '@testing-library/react';
import { UPDATE_BOUNDING_BOX } from '@app/actions/controller';
import { renderAppUI } from '@app/test/render';
import GCodeVisualizer from '../GCodeVisualizer';
import {
  disposeGCodeVisualizer,
  rectangularFixture,
} from './fixtures';
import { getBoundingBox } from '../helpers';

const mockLoad = jest.fn();
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
const controllerListeners = {};
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
const reduxStore = require('@app/store/redux').default;
const VisualizerWidget = require('../index').default;

describe('VisualizerWidget G-code loading characterization', () => {
  let model;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(controllerListeners).forEach(eventName => delete controllerListeners[eventName]);
    controller.context = {};
    const parser = new GCodeVisualizer();
    const object = parser.render(rectangularFixture);
    model = parser;
    mockLoad.mockReturnValue({ bbox: getBoundingBox(object) });
    mockUseVisualizer.mockReturnValue({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: true,
    });
  });

  afterEach(() => {
    disposeGCodeVisualizer(model);
  });

  test('passes the exact content to the owner action and completes one real parser bbox update', () => {
    const { unmount } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    act(() => {
      controllerListeners['sender:load']({
        name: 'rectangle.gcode',
        content: rectangularFixture,
      }, {});
    });

    const expectedBoundingBox = {
      min: { x: 10, y: 20, z: -2 },
      max: { x: 50, y: 60, z: 0 },
    };
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith({
      name: 'rectangle.gcode',
      content: rectangularFixture,
    });
    expect(controller.context).toMatchObject({
      xmin: 10,
      xmax: 50,
      ymin: 20,
      ymax: 60,
      zmin: -2,
      zmax: 0,
    });
    expect(reduxStore.dispatch).toHaveBeenCalledTimes(1);
    expect(reduxStore.dispatch).toHaveBeenCalledWith({
      type: UPDATE_BOUNDING_BOX,
      payload: { boundingBox: expectedBoundingBox },
    });

    unmount();
  });
});
