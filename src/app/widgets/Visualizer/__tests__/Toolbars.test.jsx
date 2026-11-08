import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import pubsub from 'pubsub-js';
import { GRBL } from '@app/constants/controller';
import { WORKFLOW_STATE_IDLE, WORKFLOW_STATE_RUNNING } from '@app/constants/workflow';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockDownloadGCode = jest.fn();
const mockConfigSet = jest.fn();
const mockConfig = {
  get: jest.fn(() => ({ id: 'profile-a' })),
  set: mockConfigSet,
  on: jest.fn(),
  removeListener: jest.fn(),
};

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    command: mockCommand,
  },
}));

jest.mock('@app/api', () => ({
  __esModule: true,
  default: {
    downloadGCode: mockDownloadGCode,
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
    t: value => value,
  },
}));

jest.mock('@app/lib/three/WebGL', () => ({
  isWebGLAvailable: jest.fn(() => true),
}));

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: mockConfig,
}));

jest.mock('@app/pages/Administration/Machines/queries', () => ({
  API_MACHINES_QUERY_KEY: ['api/machines'],
  useFetchMachinesQuery: jest.fn(() => ({
    data: {
      records: [
        { id: 'profile-a', name: 'Machine A' },
        { id: 'profile-b', name: 'Machine B' },
      ],
    },
  })),
}));

const WorkflowControl = require('../WorkflowControl').default;
const PrimaryToolbar = require('../PrimaryToolbar').default;
const SecondaryToolbar = require('../SecondaryToolbar').default;
const Dashboard = require('../Dashboard').default;

const createState = (overrides = {}) => ({
  connected: true,
  controller: {
    type: GRBL,
    state: { status: { machineState: 'Idle' } },
  },
  gcode: {
    loading: false,
    ready: true,
  },
  workflow: {
    state: WORKFLOW_STATE_IDLE,
  },
  ...overrides,
});

describe('Visualizer workflow controls', () => {
  beforeEach(() => {
    mockCommand.mockReset();
  });

  test('keeps run/pause/stop/close gates and routes user actions exactly', () => {
    const actions = {
      handleRun: jest.fn(),
      handlePause: jest.fn(),
      handleStop: jest.fn(),
      handleClose: jest.fn(),
      openModal: jest.fn(),
      uploadFile: jest.fn(),
    };

    renderAppUI(<WorkflowControl state={createState()} actions={actions} />);

    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close G-code file' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close G-code file' }));

    expect(actions.handleRun).toHaveBeenCalledTimes(1);
    expect(actions.handleClose).toHaveBeenCalledTimes(1);
    expect(mockCommand).not.toHaveBeenCalled();
  });

  test('disables every workflow action while disconnected', () => {
    const actions = {
      handleRun: jest.fn(),
      handlePause: jest.fn(),
      handleStop: jest.fn(),
      handleClose: jest.fn(),
      openModal: jest.fn(),
      uploadFile: jest.fn(),
    };

    renderAppUI(
      <WorkflowControl
        state={createState({ connected: false, gcode: { loading: false, ready: false } })}
        actions={actions}
      />
    );

    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close G-code file' })).toBeDisabled();
  });

  test('blocks run from an alarm state', () => {
    const actions = {
      handleRun: jest.fn(),
      handlePause: jest.fn(),
      handleStop: jest.fn(),
      handleClose: jest.fn(),
      openModal: jest.fn(),
      uploadFile: jest.fn(),
    };

    renderAppUI(
      <WorkflowControl
        state={createState({
          controller: { type: GRBL, state: { status: { machineState: 'Alarm' } } },
        })}
        actions={actions}
      />
    );

    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  });
});

describe('Visualizer primary toolbar', () => {
  beforeEach(() => {
    mockCommand.mockReset();
  });

  test('only enables coordinate commands when connected, initialized, and idle', async () => {
    const actions = {
      toggle3DView: jest.fn(),
      toPerspectiveProjection: jest.fn(),
      toOrthographicProjection: jest.fn(),
      toggleGCodeFilename: jest.fn(),
      toggleLimitsVisibility: jest.fn(),
      toggleCoordinateSystemVisibility: jest.fn(),
      toggleGridLineNumbersVisibility: jest.fn(),
      toggleCuttingToolVisibility: jest.fn(),
    };
    const baseState = {
      connected: true,
      controller: {
        type: GRBL,
        state: { parserstate: { modal: { wcs: 'G54' } } },
      },
      workflow: { state: WORKFLOW_STATE_IDLE },
      gcode: { displayName: true },
      projection: 'orthographic',
      objects: {
        limits: { visible: true },
        coordinateSystem: { visible: true },
        gridLineNumbers: { visible: true },
        cuttingTool: { visible: true },
      },
    };

    renderAppUI(<PrimaryToolbar state={baseState} actions={actions} />);
    const wcsButton = screen.getByRole('button', { name: /G54/ });
    expect(wcsButton).toBeEnabled();

    fireEvent.click(wcsButton);
    fireEvent.click(screen.getByRole('menuitem', { name: 'G55 (P2)' }));
    expect(mockCommand).toHaveBeenCalledWith('gcode', 'G55');

    fireEvent.click(screen.getByRole('button', { name: '3D View options' }));
    expect(await screen.findByRole('menuitem', { name: 'Perspective Projection' })).toBeEnabled();
  });

  test('disables coordinate menu actions when workflow is not idle', () => {
    const actions = {
      toggle3DView: jest.fn(),
    };
    renderAppUI(
      <PrimaryToolbar
        actions={actions}
        state={{
          connected: true,
          controller: { type: GRBL, state: {} },
          workflow: { state: WORKFLOW_STATE_RUNNING },
          gcode: {},
          objects: {},
        }}
      />
    );

    expect(screen.getByRole('button', { name: /G54/ })).toBeDisabled();
  });
});

describe('Visualizer secondary toolbar machine profiles', () => {
  beforeEach(() => {
    mockConfigSet.mockReset();
    mockConfig.get.mockReturnValue({ id: 'profile-a' });
  });

  test('keeps persisted selection separate from the server profile list', async () => {
    const { queryClient } = renderAppUI(<SecondaryToolbar />);
    const profileButton = screen.getByRole('button', { name: 'Select machine profile' });

    fireEvent.click(profileButton);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Machine B' }));

    expect(mockConfigSet).toHaveBeenCalledWith('workspace.machineProfile', {
      id: 'profile-b',
      name: 'Machine B',
    });
    expect(queryClient.getQueryData(['api/machines'])).toBeUndefined();
  });

  test('invalidates the Administration machine prefix when profiles change', () => {
    const { queryClient } = renderAppUI(<SecondaryToolbar />);
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      pubsub.publishSync('updateMachineProfiles', [{ id: 'profile-c', name: 'Machine C' }]);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['api/machines'] });
  });

  test('keeps camera controls as direct tooltip targets inside the button group', () => {
    const camera = {
      toTopView: jest.fn(),
      toFrontView: jest.fn(),
      toRightSideView: jest.fn(),
      toLeftSideView: jest.fn(),
      to3DView: jest.fn(),
      zoomFit: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
    };

    renderAppUI(<SecondaryToolbar is3DView camera={camera} />);

    fireEvent.click(screen.getByRole('button', { name: 'Front View' }));

    expect(camera.toFrontView).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Front View' })).toBeInTheDocument();
  });
});

describe('Visualizer dashboard download handoff', () => {
  beforeEach(() => {
    mockDownloadGCode.mockReset();
  });

  test('hands ready G-code downloads to the API metadata/token boundary', () => {
    renderAppUI(
      <Dashboard
        show
        state={{
          gcode: {
            content: '',
            name: 'part.nc',
            ready: true,
            sent: 0,
            size: 12,
            total: 0,
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'part.nc' }));

    expect(mockDownloadGCode).toHaveBeenCalledTimes(1);
    expect(mockDownloadGCode).toHaveBeenCalledWith();
  });
});
