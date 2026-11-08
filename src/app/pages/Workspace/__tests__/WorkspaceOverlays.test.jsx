import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockCommand = jest.fn();

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: { command: mockCommand },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@tonic-ui/react', () => {
  const React = require('react');
  const Primitive = ({ children }) => React.createElement('div', null, children);

  return {
    Alert: Primitive,
    Box: Primitive,
    Button: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
    Flex: Primitive,
    Modal: ({
      autoFocus,
      children,
      closeOnEsc,
      closeOnInteractOutside,
      ensureFocus,
      isClosable,
      isOpen,
    }) => isOpen && React.createElement('section', {
      'data-auto-focus': String(autoFocus),
      'data-close-on-esc': String(closeOnEsc),
      'data-close-on-interact-outside': String(closeOnInteractOutside),
      'data-ensure-focus': String(ensureFocus),
      'data-is-closable': String(isClosable),
      'data-testid': 'tonic-modal',
    }, children),
    ModalBody: Primitive,
    ModalContent: Primitive,
    ModalFooter: Primitive,
    ModalHeader: Primitive,
    ModalOverlay: Primitive,
    Space: Primitive,
    Text: Primitive,
  };
});

const FeederPaused = require('../modals/FeederPaused').default;
const FeederWait = require('../modals/FeederWait').default;

describe('Workspace overlays', () => {
  beforeEach(() => {
    mockCommand.mockClear();
  });

  test('feeder pause commands before closing and cannot be dismissed incidentally', () => {
    const onClose = jest.fn();
    render(<FeederPaused message="Pause" onClose={onClose} title="Paused" />);

    const modal = screen.getByTestId('tonic-modal');
    expect(modal).toHaveAttribute('data-auto-focus', 'true');
    expect(modal).toHaveAttribute('data-ensure-focus', 'true');
    expect(modal).toHaveAttribute('data-is-closable', 'false');
    expect(modal).toHaveAttribute('data-close-on-esc', 'false');
    expect(modal).toHaveAttribute('data-close-on-interact-outside', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(mockCommand).toHaveBeenCalledWith('feeder_stop');
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mockCommand).toHaveBeenLastCalledWith('feeder_start');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('feeder wait can only stop the feeder', () => {
    const onClose = jest.fn();
    render(<FeederWait onClose={onClose} title="Waiting" />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(mockCommand).toHaveBeenCalledWith('feeder_stop');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
