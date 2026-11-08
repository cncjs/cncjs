import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import useConnection from '../useConnection';

const createRuntime = () => {
  const listeners = new Set();
  let snapshot = {
    state: 'disconnected',
    type: 'serial',
    ident: null,
    options: null,
    error: null,
    isOpening: false,
    isClosing: false,
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open: jest.fn(),
    close: jest.fn(),
    command: jest.fn(),
    write: jest.fn(),
    writeln: jest.fn(),
    setSnapshot(next) {
      snapshot = { ...snapshot, ...next };
      listeners.forEach(listener => listener());
    },
  };
};

function ConnectionConsumer({ runtime }) {
  const connection = useConnection(runtime);
  return (
    <>
      <span data-testid="connection-state">{connection.state}</span>
      <button type="button" onClick={() => connection.open({ controller: {}, connection: {} })}>
        Open
      </button>
    </>
  );
}

test('subscribes to the shared connection snapshot and exposes connection actions', () => {
  const runtime = createRuntime();

  render(<ConnectionConsumer runtime={runtime} />);

  expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');

  act(() => {
    runtime.setSnapshot({ state: 'connected', ident: 'serial:/dev/ttyUSB0' });
  });

  expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  expect(runtime.open).toHaveBeenCalledWith({ controller: {}, connection: {} });
});
