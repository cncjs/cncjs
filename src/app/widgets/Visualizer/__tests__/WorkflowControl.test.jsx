import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import pubsub from 'pubsub-js';
import { renderAppUI } from '@app/test/render';
import config from '@app/store/config';
import {
  GRBL,
  GRBL_MACHINE_STATE_ALARM,
  SMOOTHIE,
  SMOOTHIE_MACHINE_STATE_ALARM,
  TINYG,
  TINYG_MACHINE_STATE_ALARM,
} from '@app/constants/controller';
import {
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_RUNNING,
} from '@app/constants/workflow';
import WorkflowControl from '../WorkflowControl';

const controllerListeners = {};
let mockMachineProfile = null;
const mockCommand = jest.fn();
const mockWrite = jest.fn();
const mockActions = {
  hideProbe: jest.fn(),
  load: jest.fn(() => ({
    bbox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 10, z: 0 },
    },
  })),
  lookAtCenter: jest.fn(),
  panDown: jest.fn(),
  panLeft: jest.fn(),
  panRight: jest.fn(),
  panUp: jest.fn(),
  resize: jest.fn(),
  showProbe: jest.fn(),
  to3DView: jest.fn(),
  toFrontView: jest.fn(),
  toLeftSideView: jest.fn(),
  toRightSideView: jest.fn(),
  toTopView: jest.fn(),
  unload: jest.fn(),
  updateProbe: jest.fn(),
  zoomFit: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
};
const mockVisualizerEngine = {
  dispose: jest.fn(),
  hideProbe: jest.fn(),
  load: jest.fn(),
  lookAtCenter: jest.fn(),
  panDown: jest.fn(),
  panLeft: jest.fn(),
  panRight: jest.fn(),
  panUp: jest.fn(),
  resize: jest.fn(),
  showProbe: jest.fn(),
  to3DView: jest.fn(),
  toFrontView: jest.fn(),
  toLeftSideView: jest.fn(),
  toRightSideView: jest.fn(),
  toTopView: jest.fn(),
  unload: jest.fn(),
  update: jest.fn(),
  updateProbe: jest.fn(),
  zoomFit: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
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
  command: mockCommand,
  connection: { ident: 'serial' },
  context: {},
  removeListener: jest.fn(),
  settings: {},
  state: { status: { machineState: 'Idle' } },
  type: GRBL,
  write: mockWrite,
  workflow: { state: WORKFLOW_STATE_IDLE },
};

jest.mock('../useVisualizer', () => ({
  __esModule: true,
  default: (...args) => mockUseVisualizer(...args),
}));
jest.mock('../VisualizerEngine', () => ({
  createVisualizerEngine: jest.fn(() => mockVisualizerEngine),
}));
jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));
const mockPortal = jest.fn();

// Keep the toolbar's real Query owner while isolating its profile-list transport.
jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(() => Promise.resolve({ data: [] })) },
}));
jest.mock('@app/lib/portal', () => mockPortal);
jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value, t: value => value },
}));
jest.mock('@app/lib/three/WebGL', () => ({
  isWebGLAvailable: jest.fn(() => true),
}));
jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn((path, fallback) => (path === 'workspace.machineProfile' ? mockMachineProfile : fallback)),
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

const VisualizerWidget = require('../index').default;

const actualUseVisualizer = jest.requireActual('../useVisualizer').default;

const emit = (eventName, ...args) => {
  act(() => controllerListeners[eventName](...args));
};

const readyDocument = () => {
  emit('sender:load', { name: 'part.gcode', content: 'G0 X1' }, {});
};

describe('WorkflowControl command acceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(controllerListeners).forEach(eventName => delete controllerListeners[eventName]);
    mockController.connection = { ident: 'serial' };
    mockController.context = {};
    mockMachineProfile = null;
    mockController.state = { status: { machineState: 'Idle' } };
    mockController.type = GRBL;
    mockController.workflow = { state: WORKFLOW_STATE_IDLE };
    mockUseVisualizer.mockImplementation(() => ({
      actions: mockActions,
      containerRef: jest.fn(),
      isReady: true,
    }));
    Object.values(mockVisualizerEngine).forEach(mock => mock.mockClear());
  });

  test('routes ready workflow controls to their exact controller commands', () => {
    const view = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    try {
      readyDocument();
      mockCommand.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      expect(mockCommand).toHaveBeenNthCalledWith(1, 'sender_start');

      emit('workflow:state', WORKFLOW_STATE_RUNNING);
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(mockCommand).toHaveBeenNthCalledWith(2, 'sender_pause');

      emit('workflow:state', WORKFLOW_STATE_PAUSED);
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
      expect(mockCommand).toHaveBeenNthCalledWith(3, 'sender_stop', { force: true });

      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      expect(mockCommand).toHaveBeenNthCalledWith(4, 'sender_resume');

      emit('workflow:state', WORKFLOW_STATE_IDLE);
      fireEvent.click(screen.getByRole('button', { name: 'Close G-code file' }));
      expect(mockCommand).toHaveBeenNthCalledWith(5, 'sender_unload');
    } finally {
      view.dispose();
    }
  });

  test('requires M6 confirmation before resuming and sends one command only when confirmed', () => {
    const view = renderAppUI(<VisualizerWidget widgetId="visualizer" />);

    try {
      readyDocument();
      emit('workflow:state', WORKFLOW_STATE_PAUSED);
      emit('sender:status', {
        hold: true,
        holdReason: { data: 'M6', msg: 'Change tool' },
      });
      mockCommand.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      expect(mockCommand).not.toHaveBeenCalled();
      const onClose = jest.fn();
      const confirmation = mockPortal.mock.calls.at(-1)[0]({ onClose });
      const dialog = renderAppUI(confirmation);

      fireEvent.click(screen.getByRole('button', { name: 'No' }));
      expect(mockCommand).not.toHaveBeenCalled();
      dialog.dispose();

      const approvedDialog = renderAppUI(mockPortal.mock.calls.at(-1)[0]({ onClose }));
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
      expect(mockCommand).toHaveBeenCalledTimes(1);
      expect(mockCommand).toHaveBeenCalledWith('sender_resume');
      approvedDialog.dispose();
    } finally {
      view.dispose();
    }
  });

  test.each([
    ['disconnected', false, GRBL, { status: { machineState: 'Idle' } }, true, ['Run', 'Pause', 'Stop', 'Close G-code file']],
    ['not ready', true, GRBL, { status: { machineState: 'Idle' } }, false, ['Run', 'Pause', 'Stop', 'Close G-code file']],
    ['a Grbl alarm', true, GRBL, { status: { machineState: GRBL_MACHINE_STATE_ALARM } }, true, ['Run', 'Pause', 'Stop']],
    ['a Smoothie alarm', true, SMOOTHIE, { status: { machineState: SMOOTHIE_MACHINE_STATE_ALARM } }, true, ['Run', 'Pause', 'Stop']],
    ['a TinyG alarm', true, TINYG, { machineState: TINYG_MACHINE_STATE_ALARM }, true, ['Run', 'Pause', 'Stop']],
  ])('does not expose execution actions when %s closes the workflow gate', (_label, connected, type, controllerState, ready, blockedActions) => {
    const actions = {
      handleClose: jest.fn(),
      handlePause: jest.fn(),
      handleRun: jest.fn(),
      handleStop: jest.fn(),
    };
    const state = {
      connected,
      controller: { type, state: controllerState },
      gcode: { loading: false, ready },
      workflow: { state: WORKFLOW_STATE_IDLE },
    };
    const view = renderAppUI(<WorkflowControl actions={actions} state={state} />);

    try {
      blockedActions.forEach(name => {
        const button = screen.getByRole('button', { name });
        expect(button).toBeDisabled();
        fireEvent.click(button);
        fireEvent.keyDown(button, { key: 'Enter' });
      });
      expect(actions.handleRun).not.toHaveBeenCalled();
      expect(actions.handlePause).not.toHaveBeenCalled();
      expect(actions.handleStop).not.toHaveBeenCalled();
      expect(actions.handleClose).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  });

  test.each([
    ['disconnected running pause', false, true, WORKFLOW_STATE_RUNNING, 'Pause'],
    ['disconnected paused stop', false, true, WORKFLOW_STATE_PAUSED, 'Stop'],
    ['not-ready running pause', true, false, WORKFLOW_STATE_RUNNING, 'Pause'],
    ['not-ready paused stop', true, false, WORKFLOW_STATE_PAUSED, 'Stop'],
  ])('blocks %s before its action can run', (_label, connected, ready, workflowState, actionName) => {
    const actions = {
      handlePause: jest.fn(),
      handleStop: jest.fn(),
    };
    const view = renderAppUI(
      <WorkflowControl
        actions={actions}
        state={{
          connected,
          controller: { type: GRBL, state: { status: { machineState: 'Idle' } } },
          gcode: { loading: false, ready },
          workflow: { state: workflowState },
        }}
      />,
    );

    try {
      const button = screen.getByRole('button', { name: actionName });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(actions.handlePause).not.toHaveBeenCalled();
      expect(actions.handleStop).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  });

  test('does not command or write during render-only visualizer updates or StrictMode cleanup', () => {
    jest.useFakeTimers();
    mockUseVisualizer.mockImplementation(options => actualUseVisualizer(options));
    const view = renderAppUI(
      <React.StrictMode>
        <VisualizerWidget widgetId="visualizer" />
      </React.StrictMode>,
    );

    try {
      expect(mockCommand).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Front View' }));
      fireEvent.click(screen.getByTitle('Disable 3D View'));
      mockMachineProfile = { id: 'profile-r5', name: 'R5 profile' };
      act(() => {
        config.on.mock.calls
          .filter(([eventName]) => eventName === 'change')
          .forEach(([, listener]) => listener());
      });
      expect(mockVisualizerEngine.update).toHaveBeenCalledWith({ machineProfile: mockMachineProfile });
      act(() => pubsub.publishSync('resize'));
      act(() => window.dispatchEvent(new Event('resize')));
      act(() => jest.advanceTimersByTime(32));
      act(() => pubsub.publishSync('updateMachineProfiles', []));
      view.rerender(
        <React.StrictMode>
          <VisualizerWidget widgetId="visualizer" />
        </React.StrictMode>,
      );
      expect(mockCommand).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    } finally {
      view.dispose();
      jest.useRealTimers();
    }
    expect(mockCommand).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
