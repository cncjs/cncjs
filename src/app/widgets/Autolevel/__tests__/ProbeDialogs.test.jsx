import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';
import StartProbeModal from '../StartProbeModal';
import StopProbeModal from '../StopProbeModal';
import TestProbeModal from '../TestProbeModal';
import ApplyView from '../ApplyView';
import SetupProbeView from '../SetupProbeView';
import { PROBE_STATE_RUNNING } from '../constants';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('pubsub-js', () => ({
  subscribe: (...args) => mockSubscribe(...args),
  unsubscribe: (...args) => mockUnsubscribe(...args),
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: (value, options = {}) => value.replace(/{{(\w+)}}/g, (_match, key) => options[key]) },
}));

jest.mock('../ProbeAreaDiagram', () => () => null);
jest.mock('../ZProbeDiagram', () => () => null);

const value = {
  clearanceZ: 5,
  endX: 10,
  endY: 10,
  endZ: -1,
  feedrate: 100,
  startX: 0,
  startY: 0,
  startZ: 0,
  stepX: 5,
  stepY: 5,
  units: 'mm',
};

describe('Autolevel probe dialogs', () => {
  test('cancels a start probe without invoking the command callback', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const view = renderAppUI(
      <StartProbeModal
        canConfirm onCancel={onCancel} onConfirm={onConfirm}
        value={value}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  });

  test('requires confirmation and invokes start probing only once', async () => {
    const onConfirm = jest.fn();
    const view = renderAppUI(
      <StartProbeModal
        canConfirm onCancel={jest.fn()} onConfirm={onConfirm}
        value={value}
      />,
    );

    try {
      const confirm = screen.getByRole('button', { name: 'Start Probing' });
      expect(confirm).toBeDisabled();
      fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' }));
      fireEvent.click(confirm);
      fireEvent.click(confirm);

      await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    } finally {
      view.dispose();
    }
  });

  test('activates start probing from the keyboard alone', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const view = renderAppUI(
      <StartProbeModal
        canConfirm onCancel={jest.fn()} onConfirm={onConfirm}
        value={value}
      />,
    );

    try {
      const confirm = screen.getByRole('checkbox', { name: 'I confirm probe wires are correctly connected' });
      confirm.focus();
      await user.keyboard(' ');

      const start = screen.getByRole('button', { name: 'Start Probing' });
      start.focus();
      await user.keyboard('{Enter}');

      expect(onConfirm).toHaveBeenCalledTimes(1);
    } finally {
      view.dispose();
    }
  });

  test('blocks invalid probe values before command callbacks can run', () => {
    const onStart = jest.fn();
    const onTest = jest.fn();
    const start = renderAppUI(
      <StartProbeModal
        canConfirm={false} onCancel={jest.fn()} onConfirm={onStart}
        value={value}
      />,
    );
    const test = renderAppUI(
      <TestProbeModal
        canConfirm={false} onCancel={jest.fn()} onConfirm={onTest}
        value={value}
      />,
    );

    try {
      fireEvent.click(screen.getAllByRole('checkbox', { name: 'I confirm probe wires are correctly connected' })[0]);
      fireEvent.click(screen.getAllByRole('checkbox', { name: 'I confirm probe wires are correctly connected' })[1]);
      expect(screen.getByRole('button', { name: 'Start Probing' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Start Test Probe' })).toBeDisabled();
      expect(onStart).not.toHaveBeenCalled();
      expect(onTest).not.toHaveBeenCalled();
    } finally {
      start.dispose();
      test.dispose();
    }
  });

  test('continues probing without stopping and stops at most once after confirmation', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const view = renderAppUI(<StopProbeModal onCancel={onCancel} onConfirm={onConfirm} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Continue Probing' }));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Stop Probing' }));
      fireEvent.click(screen.getByRole('button', { name: 'Stop Probing' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    } finally {
      view.dispose();
    }
  });
});

describe('Autolevel setup actions', () => {
  test('keeps back and probe actions accessible across probe states', () => {
    const onBack = jest.fn();
    const onStart = jest.fn();
    const onStop = jest.fn();
    const props = {
      canClick: true,
      onBack,
      onShowStartProbeConfirmation: onStart,
      onShowStopProbeConfirmation: onStop,
      value,
    };
    const view = renderAppUI(<SetupProbeView {...props} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start Probing' }));
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onStart).toHaveBeenCalledTimes(1);

      view.rerender(<SetupProbeView {...props} value={{ ...value, probeState: PROBE_STATE_RUNNING }} />);
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Stop Probing' }));
      expect(onStop).toHaveBeenCalledTimes(1);
    } finally {
      view.dispose();
    }
  });
});

describe('Autolevel ApplyView lifecycle', () => {
  beforeEach(() => {
    mockSubscribe.mockReset();
    mockUnsubscribe.mockReset();
  });

  test('keeps back, probe export, and file selection actions accessible', () => {
    const onBack = jest.fn();
    const onSaveProbeData = jest.fn();
    const view = renderAppUI(
      <ApplyView
        onBack={onBack}
        onSaveProbeData={onSaveProbeData}
        value={{
          probeStats: { points: 3, minZ: -1, maxZ: 0, maxDeviation: 1 },
          probedPositions: [{}, {}, {}],
          units: 'mm',
        }}
      />,
    );
    const fileInput = view.container.querySelector('input[type="file"]');
    const chooseFile = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByRole('button', { name: 'Export Probe Data' }));
      fireEvent.click(screen.getByRole('button', { name: 'Load G-code file' }));
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onSaveProbeData).toHaveBeenCalledTimes(1);
      expect(chooseFile).toHaveBeenCalledTimes(1);
    } finally {
      chooseFile.mockRestore();
      view.dispose();
    }
  });

  test('subscribes to each G-code event once and cleans both subscriptions on unmount', () => {
    mockSubscribe.mockImplementation(name => `${name}-token`);
    const view = renderAppUI(
      <ApplyView
        onBack={jest.fn()}
        onClear={jest.fn()}
        onExport={jest.fn()}
        onSaveProbeData={jest.fn()}
        value={{ probedPositions: [], probeStats: null, units: 'mm' }}
      />,
    );

    try {
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
      expect(mockSubscribe).toHaveBeenCalledWith('gcode:unload', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('gcode:load', expect.any(Function));
    } finally {
      view.dispose();
    }

    expect(mockUnsubscribe).toHaveBeenCalledWith('gcode:unload-token');
    expect(mockUnsubscribe).toHaveBeenCalledWith('gcode:load-token');
  });

  test('treats missing probe positions as insufficient data', () => {
    const view = renderAppUI(
      <ApplyView
        onBack={jest.fn()}
        onClear={jest.fn()}
        onExport={jest.fn()}
        onSaveProbeData={jest.fn()}
        value={{ probedPositions: null, probeStats: null, units: 'mm' }}
      />,
    );

    try {
      expect(screen.getByText('Insufficient probe data. At least 3 points are required for surface compensation.')).toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test('keeps clear as an owner callback after a successful compensation', () => {
    const onClear = jest.fn();
    const originalFileReader = global.FileReader;
    global.FileReader = jest.fn(() => ({
      readAsText() {
        this.onload({ target: { result: 'G1 X1' } });
      },
    }));
    const view = renderAppUI(
      <ApplyView
        onApply={(_gcode, _name, onSuccess) => onSuccess('G1 X1\nG1 Z-1')}
        onBack={jest.fn()}
        onClear={onClear}
        onExport={jest.fn()}
        onSaveProbeData={jest.fn()}
        value={{
          probeStats: { points: 3, minZ: -1, maxZ: 0, maxDeviation: 1 },
          probedPositions: [{}, {}, {}],
          units: 'mm',
        }}
      />,
    );

    try {
      fireEvent.change(view.container.querySelector('input[type="file"]'), {
        target: { files: [new File(['G1 X1'], 'part.gcode')] },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Clear G-code' }));
      expect(onClear).toHaveBeenCalledTimes(1);
    } finally {
      view.dispose();
      global.FileReader = originalFileReader;
    }
  });

  test('preserves the original G-code and retries compensation after an error', () => {
    const onApply = jest.fn((_gcode, _name, _onSuccess, onError) => onError('Compensation failed'));
    const originalFileReader = global.FileReader;
    global.FileReader = jest.fn(() => ({
      readAsText() {
        this.onload({ target: { result: 'G1 X1' } });
      },
    }));
    const view = renderAppUI(
      <ApplyView
        onApply={onApply}
        onBack={jest.fn()}
        onClear={jest.fn()}
        onExport={jest.fn()}
        onSaveProbeData={jest.fn()}
        value={{
          probeStats: { points: 3, minZ: -1, maxZ: 0, maxDeviation: 1 },
          probedPositions: [{}, {}, {}],
          units: 'mm',
        }}
      />,
    );

    try {
      fireEvent.change(view.container.querySelector('input[type="file"]'), {
        target: { files: [new File(['G1 X1'], 'part.gcode')] },
      });
      expect(screen.getByText('Compensation failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to compensate part.gcode')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(onApply).toHaveBeenCalledTimes(2);
      expect(onApply).toHaveBeenLastCalledWith('G1 X1', 'part.gcode', expect.any(Function), expect.any(Function), expect.any(Function));
    } finally {
      view.dispose();
      global.FileReader = originalFileReader;
    }
  });

  test('resets completed compensation when external G-code unloads', () => {
    mockSubscribe.mockImplementation(name => `${name}-token`);
    const originalFileReader = global.FileReader;
    global.FileReader = jest.fn(() => ({
      readAsText() {
        this.onload({ target: { result: 'G1 X1' } });
      },
    }));
    const view = renderAppUI(
      <ApplyView
        onApply={(_gcode, _name, onSuccess) => onSuccess('G1 X1\nG1 Z-1')}
        onBack={jest.fn()}
        onClear={jest.fn()}
        onExport={jest.fn()}
        onSaveProbeData={jest.fn()}
        value={{
          probeStats: { points: 3, minZ: -1, maxZ: 0, maxDeviation: 1 },
          probedPositions: [{}, {}, {}],
          units: 'mm',
        }}
      />,
    );

    try {
      fireEvent.change(view.container.querySelector('input[type="file"]'), {
        target: { files: [new File(['G1 X1'], 'part.gcode')] },
      });
      expect(screen.getByRole('button', { name: 'Clear G-code' })).toBeInTheDocument();
      const unload = mockSubscribe.mock.calls.find(([name]) => name === 'gcode:unload')[1];
      act(unload);
      expect(screen.queryByRole('button', { name: 'Clear G-code' })).not.toBeInTheDocument();
    } finally {
      view.dispose();
      global.FileReader = originalFileReader;
    }
  });

  test('keeps completed compensation when its own G-code load event is published', () => {
    mockSubscribe.mockImplementation(name => `${name}-token`);
    const originalFileReader = global.FileReader;
    global.FileReader = jest.fn(() => ({
      readAsText() {
        this.onload({ target: { result: 'G1 X1' } });
      },
    }));
    const view = renderAppUI(
      <ApplyView
        onApply={(_gcode, _name, onSuccess) => onSuccess('G1 X1\nG1 Z-1')}
        onBack={jest.fn()}
        onClear={jest.fn()}
        onExport={jest.fn()}
        onSaveProbeData={jest.fn()}
        value={{
          probeStats: { points: 3, minZ: -1, maxZ: 0, maxDeviation: 1 },
          probedPositions: [{}, {}, {}],
          units: 'mm',
        }}
      />,
    );

    try {
      fireEvent.change(view.container.querySelector('input[type="file"]'), {
        target: { files: [new File(['G1 X1'], 'part.gcode')] },
      });
      const load = mockSubscribe.mock.calls.find(([name]) => name === 'gcode:load')[1];
      act(() => load('gcode:load', { isProbeCompensationApplied: true }));
      expect(screen.getByRole('button', { name: 'Clear G-code' })).toBeInTheDocument();
    } finally {
      view.dispose();
      global.FileReader = originalFileReader;
    }
  });
});
