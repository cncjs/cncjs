import { GRBL, MARLIN } from '@app/constants/controller';
import {
  createCollapsedSnapshotReader,
  selectVisibleWidgetIds,
  setWidgetsCollapsed,
} from '../widgetLayoutState';
import { WIDGET_REGISTRY } from '../widgetRegistry';

jest.mock('@app/widgets/Autolevel', () => 'AutolevelWidget');
jest.mock('@app/widgets/Axes', () => 'AxesWidget');
jest.mock('@app/widgets/Connection', () => 'ConnectionWidget');
jest.mock('@app/widgets/Console', () => 'ConsoleWidget');
jest.mock('@app/widgets/Custom', () => 'CustomWidget');
jest.mock('@app/widgets/GCode', () => 'GCodeWidget');
jest.mock('@app/widgets/Grbl', () => 'GrblWidget');
jest.mock('@app/widgets/Laser', () => 'LaserWidget');
jest.mock('@app/widgets/Macro', () => 'MacroWidget');
jest.mock('@app/widgets/Marlin', () => 'MarlinWidget');
jest.mock('@app/widgets/Probe', () => 'ProbeWidget');
jest.mock('@app/widgets/Smoothie', () => 'SmoothieWidget');
jest.mock('@app/widgets/Spindle', () => 'SpindleWidget');
jest.mock('@app/widgets/TinyG', () => 'TinyGWidget');
jest.mock('@app/widgets/Tool', () => 'ToolWidget');
jest.mock('@app/widgets/Visualizer', () => 'VisualizerWidget');
jest.mock('@app/widgets/Webcam', () => 'WebcamWidget');

describe('widget registry', () => {
  test('filters controller widgets while keeping visualizer visible', () => {
    const ids = ['axes', 'grbl', 'marlin', 'visualizer', 'unknown', 'grbl:fork-1'];

    expect(Object.keys(WIDGET_REGISTRY)).toHaveLength(17);
    expect(selectVisibleWidgetIds(ids, [GRBL], WIDGET_REGISTRY)).toEqual([
      'axes',
      'grbl',
      'visualizer',
      'grbl:fork-1',
    ]);
    expect(WIDGET_REGISTRY.visualizer.hasFrame).toBe(false);
    expect(WIDGET_REGISTRY.marlin.controllerType).toBe(MARLIN);
  });
});

describe('setWidgetsCollapsed', () => {
  test('bulk collapse updates only selected ids and preserves domain settings', () => {
    const widgets = {
      axes: { minimized: false, axes: ['x', 'y'] },
      'webcam:fork-1': { minimized: false, url: 'fixture' },
      macro: { minimized: false },
    };
    const next = setWidgetsCollapsed(widgets, ['axes', 'webcam:fork-1'], true);

    expect(next.axes).toEqual({ minimized: true, axes: ['x', 'y'] });
    expect(next['webcam:fork-1'].url).toBe('fixture');
    expect(next.macro).toBe(widgets.macro);
    expect(widgets.axes.minimized).toBe(false);
    expect(setWidgetsCollapsed(next, ['axes'], true)).toBe(next);
  });

  test('empty and false no-op updates preserve identity', () => {
    const widgets = { axes: { minimized: false } };

    expect(setWidgetsCollapsed(widgets, [], true)).toBe(widgets);
    expect(setWidgetsCollapsed(widgets, ['axes'], false)).toBe(widgets);
  });
});

describe('createCollapsedSnapshotReader', () => {
  test('memoizes collapsed ids and ignores unrelated widget settings', () => {
    let widgets = {
      axes: { minimized: true, axes: ['x', 'y'] },
      macro: { minimized: false },
    };
    const reader = createCollapsedSnapshotReader({
      get: () => widgets,
    });

    const first = reader();
    expect(first).toEqual({ axes: true });
    expect(reader()).toBe(first);

    widgets = {
      axes: { minimized: true, axes: ['x', 'y', 'z'] },
      macro: { minimized: false },
    };
    expect(reader()).toBe(first);

    widgets = {
      axes: { minimized: false, axes: ['x', 'y', 'z'] },
      macro: { minimized: true },
    };
    const second = reader();
    expect(second).toEqual({ macro: true });
    expect(second).not.toBe(first);

    widgets = {};
    const empty = reader();
    expect(empty).toEqual({});
    expect(reader()).toBe(empty);
  });
});
