import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockTerminalClear = jest.fn();
const mockTerminalResize = jest.fn();
const mockTerminalClearSelection = jest.fn();
const mockTerminalRefresh = jest.fn();
const mockTerminalSelectAll = jest.fn();
const mockTerminalWriteln = jest.fn();
const mockListeners = {};
const mockUseTerminalOptions = [];
const mockEmitterListeners = {};
const mockPubsubListeners = {};
const mockControllerWrite = jest.fn();
const mockTerminalActions = {
  clear: mockTerminalClear,
  clearSelection: mockTerminalClearSelection,
  refresh: mockTerminalRefresh,
  resize: mockTerminalResize,
  selectAll: mockTerminalSelectAll,
  writeln: mockTerminalWriteln,
};
const mockUseTerminal = jest.fn(options => {
  mockUseTerminalOptions.push(options);
  return {
    actions: mockTerminalActions,
    containerRef: jest.fn(),
    isReady: true,
    prompt: '> ',
  };
});
const mockEmitter = {
  on: jest.fn((event, listener) => {
    mockEmitterListeners[event] = listener;
  }),
  off: jest.fn(),
  emit: jest.fn(event => mockEmitterListeners[event]?.()),
};

jest.mock('react-redux', () => ({
  connect: () => Component => Component,
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn((event, listener) => {
      mockListeners[event] = mockListeners[event] || [];
      mockListeners[event].push(listener);
    }),
    removeListener: jest.fn(),
    type: 'Grbl',
    write: mockControllerWrite,
  },
}));

jest.mock('pubsub-js', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn((event, listener) => {
      mockPubsubListeners[event] = listener;
      return event;
    }),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('@app/widgets/shared/useWidgetEvent', () => ({
  __esModule: true,
  default: () => mockEmitter,
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('@app/widgets/shared/WidgetEventProvider', () => ({
  __esModule: true,
  default: ({ children }) => children(mockEmitter),
}));

jest.mock('../useTerminal', () => ({
  __esModule: true,
  default: options => mockUseTerminal(options),
}));

jest.mock('../Terminal', () => {
  const React = require('react');

  return {
    __esModule: true,
    default: () => React.createElement('div'),
  };
});

const Console = require('../Console').default;

describe('Console connection lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockListeners).forEach(event => delete mockListeners[event]);
    Object.keys(mockEmitterListeners).forEach(event => delete mockEmitterListeners[event]);
    Object.keys(mockPubsubListeners).forEach(event => delete mockPubsubListeners[event]);
    mockUseTerminalOptions.length = 0;
  });

  test('clears the terminal once when the connection closes', () => {
    const view = render(<Console isConnected={true} isFullscreen={false} />);

    try {
      expect(mockListeners['connection:close']).toEqual([expect.any(Function)]);
      expect(() => mockListeners['connection:close'][0]({})).not.toThrow();
      expect(mockTerminalClear).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
    }
  });

  test('writes connection banners and data through writeln, using the terminal prompt', () => {
    const view = render(<Console isConnected={true} isFullscreen={false} />);

    try {
      mockListeners['connection:open'][0]({
        type: 'serial',
        options: { path: '/dev/ttyUSB0', baudRate: 115200 },
      });
      expect(mockTerminalWriteln).toHaveBeenCalledTimes(2);

      mockTerminalWriteln.mockClear();
      mockListeners['connection:write'][0]({}, '  G0 X1  ', { source: 'controller' });
      const writeLine = mockTerminalWriteln.mock.calls[0][0];
      expect(writeLine).toContain('controller');
      expect(writeLine).toContain('> G0 X1');

      mockListeners['connection:read'][0]({}, 'ok');
      expect(mockTerminalWriteln).toHaveBeenCalledWith('ok');
    } finally {
      view.unmount();
    }
  });

  test('filters the owner echo and forwards input with its sender id', () => {
    const view = render(<Console isConnected={true} isFullscreen={false} />);

    try {
      mockUseTerminalOptions[0].onData('G0 X1\n');
      expect(mockControllerWrite).toHaveBeenCalledTimes(1);
      const sender = mockControllerWrite.mock.calls[0][1].__sender__;
      expect(sender).toEqual(expect.any(String));

      mockTerminalWriteln.mockClear();
      mockListeners['connection:write'][0]({}, 'G0 X1', { __sender__: sender });
      expect(mockTerminalWriteln).not.toHaveBeenCalled();

      mockListeners['connection:write'][0]({}, 'G0 X1', { __sender__: 'another-owner' });
      expect(mockTerminalWriteln).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
    }
  });

  test('gives each mounted Console owner a distinct sender id', () => {
    const view = render(
      <>
        <Console isConnected={true} isFullscreen={false} />
        <Console isConnected={true} isFullscreen={false} />
      </>,
    );

    try {
      expect(mockUseTerminalOptions).toHaveLength(2);
      mockUseTerminalOptions[0].onData('first\n');
      mockUseTerminalOptions[1].onData('second\n');

      const firstSender = mockControllerWrite.mock.calls[0][1].__sender__;
      const secondSender = mockControllerWrite.mock.calls[1][1].__sender__;
      expect(firstSender).toEqual(expect.any(String));
      expect(secondSender).toEqual(expect.any(String));
      expect(firstSender).not.toBe(secondSender);
    } finally {
      view.unmount();
    }
  });

  test('resizes on the shared resize event and fullscreen changes', () => {
    const view = render(<Console isConnected={true} isFullscreen={false} />);

    try {
      mockTerminalResize.mockClear();
      mockPubsubListeners.resize();
      expect(mockTerminalResize).toHaveBeenCalledTimes(1);

      mockTerminalResize.mockClear();
      view.rerender(<Console isConnected={true} isFullscreen={true} />);
      expect(mockTerminalResize).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
    }
  });

  test('routes terminal widget events to the owner actions', () => {
    const view = render(<Console isConnected={true} isFullscreen={false} />);

    try {
      mockEmitterListeners['terminal:clearSelection']();
      mockEmitterListeners['terminal:refresh']();
      mockEmitterListeners['terminal:selectAll']();

      expect(mockTerminalClearSelection).toHaveBeenCalledTimes(1);
      expect(mockTerminalRefresh).toHaveBeenCalledTimes(1);
      expect(mockTerminalSelectAll).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
    }
  });
});

test('Console shell Clear button reaches the terminal owner without a controller command', () => {
  const ConsoleWidget = require('../index').default;
  const view = renderAppUI(<ConsoleWidget
    widgetId="console" view="normal"
    onViewChange={jest.fn()} onFork={jest.fn()} onRemove={jest.fn()}
    sortable={{}}
  />);
  mockTerminalClear.mockClear();
  mockControllerWrite.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Clear console' }));
  expect(mockTerminalClear).toHaveBeenCalledTimes(1);
  expect(mockControllerWrite).not.toHaveBeenCalled();
  view.unmount();
  expect(mockEmitter.off).toHaveBeenCalledWith('terminal:clear', expect.any(Function));
});
