import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';
import Tool, { getToolProbeCommands } from '../Tool';
import ToolWidget, { createToolConfigDraft } from '../index';
import { useSaveToolConfigMutation, useToolConfigQuery } from '../queries';
import {
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
} from '../constants';

const mockGetToolConfig = jest.fn();
const mockSetToolConfig = jest.fn();

jest.mock('@app/api', () => ({
  __esModule: true,
  default: {
    getToolConfig: (...args) => mockGetToolConfig(...args),
    setToolConfig: (...args) => mockSetToolConfig(...args),
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@app/widgets/shared/WidgetConfig', () => ({
  __esModule: true,
  default: class MockWidgetConfig {},
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(),
    connection: { ident: 'test' },
    removeListener: jest.fn(),
    settings: {},
    state: {},
    type: 'Grbl',
    workflow: { state: '' },
  },
}));

function ToolConfigQueryProbe() {
  const query = useToolConfigQuery();
  const mutation = useSaveToolConfigMutation();

  return (
    <>
      <output>{query.data ? query.data.toolProbeCommand : 'loading'}</output>
      <button type="button" onClick={() => mutation.mutate({ toolProbeCommand: 'G38.3' })}>
        Save tool configuration
      </button>
    </>
  );
}

describe('Tool configuration query boundary', () => {
  beforeEach(() => {
    mockGetToolConfig.mockResolvedValue({ body: { toolProbeCommand: 'G38.2' } });
    mockSetToolConfig.mockResolvedValue({ body: { ok: true } });
  });

  test('reads the API response body and invalidates only after a successful full-payload save', async () => {
    const view = renderAppUI(<ToolConfigQueryProbe />);
    const invalidateQueries = jest.spyOn(view.queryClient, 'invalidateQueries');

    try {
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('G38.2'));
      fireEvent.click(screen.getByRole('button', { name: 'Save tool configuration' }));

      await waitFor(() => expect(mockSetToolConfig).toHaveBeenCalledWith({ toolProbeCommand: 'G38.3' }));
      await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['api/tool'] }));
    } finally {
      view.dispose();
    }
  });

  test('does not invalidate the cached configuration when saving fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSetToolConfig.mockRejectedValueOnce(new Error('tool save failed'));
    const view = renderAppUI(<ToolConfigQueryProbe />);
    const invalidateQueries = jest.spyOn(view.queryClient, 'invalidateQueries');

    try {
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('G38.2'));
      fireEvent.click(screen.getByRole('button', { name: 'Save tool configuration' }));

      await waitFor(() => expect(mockSetToolConfig).toHaveBeenCalledTimes(1));
      await new Promise(resolve => {
        setTimeout(() => resolve(), 0);
      });
      expect(invalidateQueries).not.toHaveBeenCalled();
    } finally {
      view.dispose();
      consoleError.mockRestore();
    }
  });
});

describe('Tool controlled form', () => {
  const value = {
    toolChangePolicy: TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
    toolChangeX: 1,
    toolChangeY: 2,
    toolChangeZ: 3,
    toolProbeX: 4,
    toolProbeY: 5,
    toolProbeZ: 6,
    toolProbeCustomCommands: 'G91',
    toolProbeCommand: 'G38.2',
    toolProbeDistance: 1,
    toolProbeFeedrate: 10,
    touchPlateHeight: 0,
  };

  test('reports an accepted custom-command edit through the controlled value callback', () => {
    const onChange = jest.fn();
    const view = renderAppUI(
      <Tool
        canClick
        connected
        controller={{ type: 'Grbl' }}
        machinePosition={{}}
        units="mm"
        value={value}
        onChange={onChange}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Edit custom tool probe commands' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Custom Tool Probe Commands' }), {
        target: { value: 'G91\nG38.2' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save custom tool probe commands' }));

      expect(onChange).toHaveBeenLastCalledWith({
        ...value,
        toolProbeCustomCommands: 'G91\nG38.2',
      });
    } finally {
      view.dispose();
    }
  });

  test('reports a keyboard-only custom-command edit through the controlled callback', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const view = renderAppUI(
      <Tool
        canClick
        connected
        controller={{ type: 'Grbl' }}
        machinePosition={{}}
        units="mm"
        value={value}
        onChange={onChange}
      />,
    );

    try {
      const edit = screen.getByRole('button', { name: 'Edit custom tool probe commands' });
      edit.focus();
      await user.keyboard('{Enter}');

      const textarea = screen.getByRole('textbox', { name: 'Custom Tool Probe Commands' });
      textarea.focus();
      await user.clear(textarea);
      await user.keyboard('G0 Z5');

      const save = screen.getByRole('button', { name: 'Save custom tool probe commands' });
      save.focus();
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenLastCalledWith({
        ...value,
        toolProbeCustomCommands: 'G0 Z5',
      });
    } finally {
      view.dispose();
    }
  });

  test('discards a cancelled custom-command edit', () => {
    const onChange = jest.fn();
    const view = renderAppUI(
      <Tool
        canClick
        connected
        controller={{ type: 'Grbl' }}
        machinePosition={{}}
        units="mm"
        value={value}
        onChange={onChange}
      />,
    );

    try {
      onChange.mockClear();
      fireEvent.click(screen.getByRole('button', { name: 'Edit custom tool probe commands' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Custom Tool Probe Commands' }), {
        target: { value: 'G91\nG38.2' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel custom tool probe commands' }));

      expect(onChange).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  });

  test('inserts a selected variable at the textarea caret', () => {
    const view = renderAppUI(
      <Tool
        canClick
        connected
        controller={{ type: 'Grbl' }}
        machinePosition={{}}
        units="mm"
        value={value}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Edit custom tool probe commands' }));
      const textarea = screen.getByRole('textbox', { name: 'Custom Tool Probe Commands' });
      fireEvent.change(textarea, { target: { value: 'G91G38.2', selectionStart: 3, selectionEnd: 3 } });
      fireEvent.click(screen.getByRole('button', { name: 'Insert variable' }));
      fireEvent.click(screen.getByRole('menuitem', { name: '[tool_probe_command]' }));

      expect(textarea).toHaveValue('G91[tool_probe_command]G38.2');
    } finally {
      view.dispose();
    }
  });

  test('preserves a dirty field while adopting untouched fields from external configuration', () => {
    const onChange = jest.fn();
    const props = {
      connected: true,
      controller: { type: 'Grbl' },
      units: 'mm',
      onChange,
    };
    const view = renderAppUI(<Tool {...props} value={value} />);

    try {
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Tool Change X' }), {
        target: { value: '42' },
      });
      view.rerender(<Tool {...props} value={{ ...value, toolChangeX: 9, toolChangeY: 8 }} />);
      expect(screen.getByRole('spinbutton', { name: 'Tool Change X' })).toHaveValue(42);
      expect(screen.getByRole('spinbutton', { name: 'Tool Change Y' })).toHaveValue(8);
      expect(onChange).toHaveBeenLastCalledWith({ ...value, toolChangeX: '42', toolChangeY: 8 });
    } finally {
      view.dispose();
    }
  });

  test('clears the copied-feedback timer when unmounted', () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const execCommand = jest.fn();
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    const defaultValue = {
      ...value,
      toolChangePolicy: 2,
    };
    const view = renderAppUI(
      <Tool
        canClick
        connected
        controller={{ type: 'Grbl' }}
        machinePosition={{}}
        units="mm"
        value={defaultValue}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Copy tool probe commands' }));
      view.dispose();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    } finally {
      clearTimeoutSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  test('does not expose probe commands while disconnected', () => {
    const defaultValue = {
      ...value,
      toolChangePolicy: 2,
    };
    const view = renderAppUI(
      <Tool controller={{ type: 'Grbl' }} units="mm" value={defaultValue} />,
    );

    try {
      expect(screen.getByText('Connect to the controller to view the tool probe commands.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Copy tool probe commands' })).not.toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });
});

describe('Tool probe command templates', () => {
  test('preserves the controller-specific WCS and TLO command sequences', () => {
    expect(getToolProbeCommands('Marlin', 2)).toBe([
      '; Probe the tool',
      'G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - posz - tool_probe_distance]',
      '; Set the current work Z position (posz) to the touch plate height',
      'G92 Z[touch_plate_height]',
    ].join('\n'));
    expect(getToolProbeCommands('Grbl', 3)).toContain('G43.1 Z[posz - touch_plate_height]');
    expect(getToolProbeCommands('TinyG', 3)).toContain('{tofz:[posz - touch_plate_height]}');
  });
});

describe('Tool draft normalization', () => {
  test('keeps the server payload separate by normalizing its complete metric draft', () => {
    expect(createToolConfigDraft({ toolChangeX: 12, toolProbeCustomCommands: undefined }, 'mm')).toEqual({
      toolChangePolicy: 0,
      toolChangeX: '12.000',
      toolChangeY: '0.000',
      toolChangeZ: '0.000',
      toolProbeX: '0.000',
      toolProbeY: '0.000',
      toolProbeZ: '0.000',
      toolProbeCustomCommands: '',
      toolProbeCommand: 'G38.2',
      toolProbeDistance: 1,
      toolProbeFeedrate: 10,
      touchPlateHeight: 0,
    });
  });
});

describe('Tool widget draft ownership', () => {
  test('shows refresh progress until the configuration request finishes', async () => {
    let finishRefresh;
    mockGetToolConfig.mockReset();
    mockGetToolConfig.mockResolvedValueOnce({ body: { toolProbeCommand: 'G38.2' } });
    mockGetToolConfig.mockImplementationOnce(() => new Promise(resolve => {
      finishRefresh = resolve;
    }));
    mockGetToolConfig.mockResolvedValue({ body: { toolProbeCommand: 'G38.2' } });
    const view = renderAppUI(
      <ToolWidget widgetId="tool" view="normal" onViewChange={jest.fn()} />,
    );

    try {
      await screen.findByRole('button', { name: 'Tool Change Policy' });
      const refresh = screen.getByRole('button', { name: 'Refresh tool configuration' });
      expect(within(refresh).queryByRole('progressbar', { hidden: true })).not.toBeInTheDocument();
      fireEvent.click(refresh);
      await waitFor(() => expect(within(refresh).getByRole('progressbar', { hidden: true })).toBeInTheDocument());
      finishRefresh({ body: { toolProbeCommand: 'G38.3' } });
      await waitFor(() => expect(within(refresh).queryByRole('progressbar', { hidden: true })).not.toBeInTheDocument());
      expect(mockGetToolConfig).toHaveBeenCalledTimes(2);
    } finally {
      view.dispose();
    }
  });

  test('does not save while hydrating the initial query response', async () => {
    const view = renderAppUI(
      <ToolWidget
        widgetId="tool"
        view="normal"
        onViewChange={jest.fn()}
      />,
    );

    try {
      await waitFor(() => expect(screen.getByRole('button', { name: 'Tool Change Policy' })).toHaveTextContent('Ignore M6 commands (Default)'));
      await new Promise(resolve => {
        setTimeout(() => resolve(), 150);
      });
      expect(mockSetToolConfig).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  });

  test('debounces edits into one complete configuration save', async () => {
    const view = renderAppUI(
      <ToolWidget
        widgetId="tool"
        view="normal"
        onViewChange={jest.fn()}
      />,
    );

    try {
      const policy = await screen.findByRole('button', { name: 'Tool Change Policy' });
      fireEvent.click(policy);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Send M6 commands' }));
      fireEvent.click(screen.getByRole('button', { name: 'Tool Change Policy' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Ignore M6 commands (Default)' }));

      await waitFor(() => expect(mockSetToolConfig).toHaveBeenCalledTimes(1));
      expect(mockSetToolConfig).toHaveBeenCalledWith({
        toolChangePolicy: 0,
        toolChangeX: 0,
        toolChangeY: 0,
        toolChangeZ: 0,
        toolProbeX: 0,
        toolProbeY: 0,
        toolProbeZ: 0,
        toolProbeCustomCommands: '',
        toolProbeCommand: 'G38.2',
        toolProbeDistance: 1,
        toolProbeFeedrate: 10,
        touchPlateHeight: 0,
      });
    } finally {
      view.dispose();
    }
  });
});
