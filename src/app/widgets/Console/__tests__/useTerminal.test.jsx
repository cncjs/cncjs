import React from 'react';
import { act, render } from '@testing-library/react';
import useTerminal from '../useTerminal';

jest.mock('@app/lib/i18n', () => ({ __esModule: true, default: { _: text => text } }));

const mockXtermInstances = [];
const mockFitAddons = [];
const mockScrollbars = [];
const mockResizeObservers = [];
const originalResizeObserver = global.ResizeObserver;

jest.mock('xterm', () => ({
  Terminal: jest.fn(options => {
    const loadedAddons = new Set();
    const line = {
      length: 80,
      loadCell: jest.fn(),
      setCell: jest.fn(),
      translateToString: jest.fn(() => '> '),
    };
    const instance = {
      cols: 80,
      element: {},
      onKey: jest.fn(),
      onResize: jest.fn(),
      options,
      prompt: null,
      refresh: jest.fn(),
      resize: jest.fn(),
      rows: 24,
      setOption: jest.fn(),
      textarea: {},
      write: jest.fn((_data, callback) => callback?.()),
      clear: jest.fn(),
      clearSelection: jest.fn(),
      selectAll: jest.fn(),
      _core: {
        buffer: {
          getNullCell: jest.fn(() => ({})),
          lines: { get: jest.fn(() => line) },
          x: 2,
          y: 0,
          ybase: 0,
        },
        refresh: jest.fn(),
      },
      keyDisposable: { dispose: jest.fn() },
      resizeDisposable: { dispose: jest.fn() },
      loadAddon: jest.fn(addon => {
        const dispose = addon.dispose;
        let disposed = false;
        addon.dispose = jest.fn(() => {
          if (!disposed) {
            disposed = true;
            loadedAddons.delete(addon);
            dispose();
          }
        });
        loadedAddons.add(addon);
      }),
      open: jest.fn(),
      focus: jest.fn(),
      dispose: jest.fn(),
    };
    instance.dispose.mockImplementation(() => {
      [...loadedAddons].forEach(addon => addon.dispose());
    });
    instance.line = line;
    instance.open.mockImplementation(node => {
      const xtermElement = node.ownerDocument.createElement('div');
      xtermElement.className = 'xterm';
      const viewportElement = node.ownerDocument.createElement('div');
      viewportElement.className = 'xterm-viewport';
      node.appendChild(xtermElement);
      node.appendChild(viewportElement);
    });
    instance.onKey.mockImplementation(handler => {
      instance.keyHandler = handler;
      return instance.keyDisposable;
    });
    instance.onResize.mockImplementation(handler => {
      instance.resizeHandler = handler;
      return instance.resizeDisposable;
    });
    mockXtermInstances.push(instance);
    return instance;
  }),
}));

jest.mock('xterm-addon-fit', () => ({
  FitAddon: jest.fn(() => {
    const addon = {
      dispose: jest.fn(),
      proposeDimensions: jest.fn(() => ({ cols: 80, rows: 24 })),
    };
    mockFitAddons.push(addon);
    return addon;
  }),
}));

jest.mock('perfect-scrollbar', () => jest.fn(() => {
  const scrollbar = {
    destroy: jest.fn(),
    update: jest.fn(),
  };
  mockScrollbars.push(scrollbar);
  return scrollbar;
}));

let latestApi;

function Harness(props) {
  latestApi = useTerminal(props);
  return <div ref={latestApi.containerRef} />;
}

describe('useTerminal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockXtermInstances.length = 0;
    mockFitAddons.length = 0;
    mockScrollbars.length = 0;
    mockResizeObservers.length = 0;
    global.ResizeObserver = jest.fn(function ResizeObserver(callback) {
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      this.callback = callback;
      mockResizeObservers.push(this);
    });
    latestApi = undefined;
  });

  afterEach(() => {
    if (originalResizeObserver) {
      global.ResizeObserver = originalResizeObserver;
    } else {
      delete global.ResizeObserver;
    }
  });

  test('creates no resource while disabled and disposes every owned resource', () => {
    const view = render(
      <Harness
        enabled={false}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={jest.fn()}
      />,
    );

    expect(mockXtermInstances).toHaveLength(0);

    view.rerender(
      <Harness
        enabled={true}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={jest.fn()}
      />,
    );

    expect(mockXtermInstances).toHaveLength(1);
    const [term] = mockXtermInstances;
    const [addon] = mockFitAddons;
    expect(term.textarea.onpaste).toEqual(expect.any(Function));
    view.unmount();

    expect(term.keyDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(term.resizeDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(term.textarea.onpaste).toBeNull();
    expect(mockScrollbars[0].destroy).toHaveBeenCalledTimes(1);
    expect(addon.dispose).toHaveBeenCalledTimes(1);
    expect(term.dispose).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mockScrollbars[0].destroy).toHaveBeenCalledTimes(1);
    expect(addon.dispose).toHaveBeenCalledTimes(1);
    expect(term.dispose).toHaveBeenCalledTimes(1);
  });

  test('keeps one xterm resource while options, dimensions, and onData change', () => {
    const firstOnData = jest.fn();
    const secondOnData = jest.fn();
    const view = render(
      <Harness
        enabled={true}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={firstOnData}
      />,
    );

    const [term] = mockXtermInstances;
    act(() => {
      term.keyHandler({
        key: '\u0003',
        domEvent: {
          altGraphKey: false,
          altKey: false,
          ctrlKey: true,
          key: 'c',
          metaKey: false,
        },
      });
    });
    expect(firstOnData).toHaveBeenCalledWith('\u0003');

    view.rerender(
      <Harness
        enabled={true}
        cols={254}
        rows={20}
        cursorBlink={false}
        scrollback={500}
        tabStopWidth={4}
        onData={secondOnData}
      />,
    );

    expect(mockXtermInstances).toHaveLength(1);
    expect(term.setOption).toHaveBeenCalledWith('cursorBlink', false);
    expect(term.setOption).toHaveBeenCalledWith('scrollback', 500);
    expect(term.setOption).toHaveBeenCalledWith('tabStopWidth', 4);
    expect(term.resize).toHaveBeenCalledWith(254, 20);

    act(() => {
      term.keyHandler({
        key: '\u0004',
        domEvent: {
          altGraphKey: false,
          altKey: false,
          ctrlKey: true,
          key: 'd',
          metaKey: false,
        },
      });
    });
    expect(secondOnData).toHaveBeenCalledWith('\u0004');
    view.unmount();
  });

  test('disposes and recreates the resource across disconnect and reconnect', () => {
    const view = render(
      <Harness
        enabled={true}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={jest.fn()}
      />,
    );
    const firstTerm = mockXtermInstances[0];

    view.rerender(
      <Harness
        enabled={false}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={jest.fn()}
      />,
    );
    expect(firstTerm.dispose).toHaveBeenCalledTimes(1);

    view.rerender(
      <Harness
        enabled={true}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={jest.fn()}
      />,
    );
    expect(mockXtermInstances).toHaveLength(2);
    expect(mockXtermInstances[1]).not.toBe(firstTerm);
    view.unmount();
    expect(mockXtermInstances[1].dispose).toHaveBeenCalledTimes(1);
  });

  test('uses the latest onData callback for Enter and preserves history navigation', () => {
    const firstOnData = jest.fn();
    const secondOnData = jest.fn();
    const view = render(
      <Harness
        enabled={true}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={firstOnData}
      />,
    );
    const [term] = mockXtermInstances;
    term.line.translateToString.mockReturnValue('> G0');
    term._core.buffer.x = 4;
    term.keyHandler({ key: '\n', domEvent: { key: 'Enter' } });
    expect(firstOnData).toHaveBeenCalledWith('G0\n');

    view.rerender(
      <Harness
        enabled={true}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={secondOnData}
      />,
    );
    term.line.translateToString.mockReturnValue('> ');
    term._core.buffer.x = 2;
    term.keyHandler({ key: 'ArrowUp', domEvent: { key: 'ArrowUp' } });
    expect(term.write).toHaveBeenCalledWith('G0');

    term.line.translateToString.mockReturnValue('> G1');
    term._core.buffer.x = 4;
    term.keyHandler({ key: '\n', domEvent: { key: 'Enter' } });
    expect(secondOnData).toHaveBeenCalledWith('G1\n');
    view.unmount();
  });

  test('preserves prompt, paste, and owner actions', () => {
    const onData = jest.fn();
    const view = render(
      <Harness
        enabled={true}
        cols={254}
        rows={15}
        cursorBlink={true}
        scrollback={1000}
        tabStopWidth={2}
        onData={onData}
      />,
    );

    const [term] = mockXtermInstances;
    expect(latestApi.prompt).toBe('> ');
    term.prompt();
    expect(term.write).toHaveBeenCalledWith('\r\n');
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('> '));

    act(() => {
      term.textarea.onpaste({
        clipboardData: { getData: jest.fn(() => 'G0\n\nG1') },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      });
    });
    expect(onData).toHaveBeenCalledWith('G0\n');
    expect(onData).toHaveBeenCalledWith('G1\n');

    latestApi.actions.clear();
    latestApi.actions.clearSelection();
    latestApi.actions.refresh();
    latestApi.actions.selectAll();
    latestApi.actions.writeln('response');
    expect(term.clear).toHaveBeenCalledTimes(1);
    expect(term.clearSelection).toHaveBeenCalledTimes(1);
    expect(term.refresh).toHaveBeenCalled();
    expect(term.selectAll).toHaveBeenCalledTimes(1);
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('response'), undefined);
    mockScrollbars[0].update.mockClear();
    term.resizeHandler(254, 15);
    expect(mockScrollbars[0].update).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  test('leaves one active resource under StrictMode and none after unmount', () => {
    const view = render(
      <React.StrictMode>
        <Harness
          enabled={true}
          cols={254}
          rows={15}
          cursorBlink={true}
          scrollback={1000}
          tabStopWidth={2}
          onData={jest.fn()}
        />
      </React.StrictMode>,
    );

    const activeBeforeUnmount = mockXtermInstances.filter(term => term.dispose.mock.calls.length === 0);
    expect(activeBeforeUnmount).toHaveLength(1);
    expect(mockFitAddons.filter(addon => addon.dispose.mock.calls.length === 0)).toHaveLength(1);
    expect(mockScrollbars.filter(scrollbar => scrollbar.destroy.mock.calls.length === 0)).toHaveLength(1);
    view.unmount();
    const activeAfterUnmount = mockXtermInstances.filter(term => term.dispose.mock.calls.length === 0);
    expect(activeAfterUnmount).toHaveLength(0);
    expect(mockFitAddons.filter(addon => addon.dispose.mock.calls.length === 0)).toHaveLength(0);
    expect(mockScrollbars.filter(scrollbar => scrollbar.destroy.mock.calls.length === 0)).toHaveLength(0);
  });

  test('returns xterm, addons, and scrollbar resources to zero after 20 cycles', () => {
    for (let index = 0; index < 20; ++index) {
      const view = render(
        <Harness
          enabled={true}
          cols={254}
          rows={15}
          cursorBlink={true}
          scrollback={1000}
          tabStopWidth={2}
          onData={jest.fn()}
        />,
      );
      view.unmount();
    }

    expect(mockXtermInstances).toHaveLength(20);
    expect(mockFitAddons).toHaveLength(20);
    expect(mockScrollbars).toHaveLength(20);
    expect(mockResizeObservers).toHaveLength(20);
    mockResizeObservers.forEach(observer => {
      expect(observer.observe).toHaveBeenCalledTimes(1);
      expect(observer.disconnect).toHaveBeenCalledTimes(1);
    });
    expect(mockXtermInstances.filter(term => term.dispose.mock.calls.length === 0)).toHaveLength(0);
    expect(mockFitAddons.filter(addon => addon.dispose.mock.calls.length === 0)).toHaveLength(0);
    expect(mockScrollbars.filter(scrollbar => scrollbar.destroy.mock.calls.length === 0)).toHaveLength(0);
    mockXtermInstances.forEach(term => {
      expect(term.dispose).toHaveBeenCalledTimes(1);
    });
    mockFitAddons.forEach(addon => {
      expect(addon.dispose).toHaveBeenCalledTimes(1);
    });
    mockScrollbars.forEach(scrollbar => {
      expect(scrollbar.destroy).toHaveBeenCalledTimes(1);
    });
  });
  test('does not submit hidden, wrapped or promptless rows', () => {
    const onData = jest.fn();
    const view = render(<Harness
      enabled cols={80} rows={15}
      onData={onData}
    />);
    const [term] = mockXtermInstances;
    for (const [text, isWrapped] of [['> ' + 'X'.repeat(78), false], ['> G1 X10', true], ['response', false]]) {
      term.line.translateToString.mockReturnValue(text);
      term.line.isWrapped = isWrapped;
      term.keyHandler({ key: '\r', domEvent: { key: 'Enter' } });
    }
    expect(onData).not.toHaveBeenCalled();
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('Command not sent'));
    view.unmount();
  });

  test('waits for pending xterm writes before reading and sending Enter', () => {
    const onData = jest.fn();
    const view = render(<Harness
      enabled cols={256} rows={15}
      onData={onData}
    />);
    const [term] = mockXtermInstances;
    const callbacks = [];
    term.write.mockImplementation((_data, callback) => {
      if (callback) {
        callbacks.push(callback);
      }
    });
    term.keyHandler({ key: '\r', domEvent: { key: 'Enter' } });
    expect(onData).not.toHaveBeenCalled();
    term.line.translateToString.mockReturnValue('> G1 X123');
    while (callbacks.length) {
      callbacks.shift()();
    }
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith('G1 X123\r');
    view.unmount();
  });

  test('keeps input visible during a shrink and preserves cursor across output', () => {
    const view = render(<Harness
      enabled cols={256} rows={15}
      onData={jest.fn()}
    />);
    const [term] = mockXtermInstances;
    term.cols = 256;
    term.line.translateToString.mockReturnValue('> ' + 'X'.repeat(150));
    term._core.buffer.x = 102;
    latestApi.actions.resize(80, 15);
    expect(term.resize).toHaveBeenLastCalledWith(153, 15);
    expect(latestApi.actions.hasPendingInput()).toBe(true);
    latestApi.actions.writeln('machine output');
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('\x1b[50D'), undefined);
    view.unmount();
  });

  test('applies font and palette changes without replacing the terminal', () => {
    const view = render(<Harness
      enabled cols={256} rows={15}
      fontSize={14} onData={jest.fn()}
    />);
    view.rerender(<Harness
      enabled cols={256} rows={15}
      fontSize={24} background="white" textColor="amber"
      onData={jest.fn()}
    />);
    const [term] = mockXtermInstances;
    expect(mockXtermInstances).toHaveLength(1);
    expect(term.setOption).toHaveBeenCalledWith('fontSize', 24);
    expect(term.setOption).toHaveBeenCalledWith('theme', expect.objectContaining({ background: '#ffffff', white: '#9a6700', cursor: '#9a6700' }));
    expect(term.refresh).toHaveBeenCalled();
    view.unmount();
  });
  test('rejects excess typing and a history entry wider than the current row', () => {
    const onData = jest.fn();
    const view = render(<Harness
      enabled cols={256} rows={15}
      onData={onData}
    />);
    const [term] = mockXtermInstances;
    term.cols = 256;
    term.line.translateToString.mockReturnValue('> ' + 'X'.repeat(100));
    term.keyHandler({ key: '\r', domEvent: { key: 'Enter' } });
    expect(onData).toHaveBeenCalledTimes(1);
    term.cols = 80;
    term.line.translateToString.mockReturnValue('> ');
    term.keyHandler({ key: 'ArrowUp', domEvent: { key: 'ArrowUp' } });
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('This history entry does not fit'));
    term.line.translateToString.mockReturnValue('> ' + 'X'.repeat(77));
    term._core.buffer.x = 79;
    term.write.mockClear();
    term.keyHandler({ key: 'Y', domEvent: { key: 'Y' } });
    expect(term.write).not.toHaveBeenCalledWith('Y');
    expect(onData).toHaveBeenCalledTimes(1);
    view.unmount();
  });
  test.each([true, false])('serializes Clear all behind pending output (readOnly=%s)', readOnly => {
    const onData = jest.fn();
    const view = render(<Harness
      enabled cols={80} rows={15}
      readOnly={readOnly} onData={onData}
    />);
    const [term] = mockXtermInstances;
    const callbacks = [];
    term.write.mockImplementation((_data, callback) => {
      if (callback) {
        callbacks.push(callback);
      }
    });
    latestApi.actions.writeln('pending output');
    latestApi.actions.clear();
    expect(term.clear).not.toHaveBeenCalled();
    while (callbacks.length) {
      callbacks.shift()();
    }
    expect(term.clear).toHaveBeenCalledTimes(1);
    term.write.mockClear();
    latestApi.actions.writeln('fresh output');
    while (callbacks.length) {
      callbacks.shift()();
    }
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining(readOnly ? '\x1b[2K\rfresh output' : 'fresh output\r\n'), undefined);
    expect(onData).not.toHaveBeenCalled();
    view.unmount();
  });

  test('touch mode suppresses terminal keys and paste, preserves history across mode switches', () => {
    const onData = jest.fn();
    const view = render(<Harness
      enabled cols={80} rows={15}
      onData={onData}
    />);
    const [term] = mockXtermInstances;
    term.line.translateToString.mockReturnValue('> G0');
    term.keyHandler({ key: '\r', domEvent: { key: 'Enter' } });
    onData.mockClear();
    view.rerender(<Harness
      enabled cols={80} rows={15}
      readOnly onData={onData}
    />);
    expect(mockXtermInstances).toHaveLength(1);
    expect(term.textarea.readOnly).toBe(true);
    term.keyHandler({ key: '\r', domEvent: { key: 'Enter' } });
    term.keyHandler({ key: '\x03', domEvent: { key: 'c', ctrlKey: true } });
    term.textarea.onpaste({ preventDefault: jest.fn(), stopPropagation: jest.fn(), clipboardData: { getData: () => 'G1\n' } });
    expect(onData).not.toHaveBeenCalled();
    latestApi.actions.writeln('last line');
    latestApi.actions.clear();
    term.write.mockClear();
    view.rerender(<Harness
      enabled cols={80} rows={15}
      readOnly={false} onData={onData}
    />);
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('> '));
    expect(term.write.mock.calls.some(([text]) => text.startsWith('\r\n'))).toBe(false);
    expect(term.textarea.readOnly).toBe(false);
    term.line.translateToString.mockReturnValue('> ');
    term.keyHandler({ key: 'ArrowUp', domEvent: { key: 'ArrowUp' } });
    expect(term.write).toHaveBeenCalledWith('G0');
    view.unmount();
  });
});
