import React from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import WidgetManager from '../widget-manager/WidgetManager';

const configValues = {
  'workspace.container.default.widgets': ['visualizer'],
  'workspace.container.primary.widgets': ['connection', 'grbl'],
  'workspace.container.secondary.widgets': ['axes'],
};

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    availableControllers: ['Grbl'],
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
  },
}));

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn((path, fallback) => (
      Object.prototype.hasOwnProperty.call(configValues, path) ? configValues[path] : fallback
    )),
  },
}));

jest.mock('@tonic-ui/react', () => {
  const React = require('react');
  const Primitive = ({
    align,
    as: Element = 'div',
    children,
    gap,
    justify,
    mb,
    opacity,
    px,
    sx,
    templateColumns,
    ...props
  }) => React.createElement(Element, props, children);
  const Modal = ({ children, isOpen, onClose }) => isOpen && React.createElement(
    'section',
    { 'data-testid': 'modal' },
    React.createElement('button', {
      type: 'button',
      'aria-label': 'Close',
      'data-testid': 'modal-close',
      onClick: onClose,
    }),
    children
  );
  const Checkbox = ({ checked, children, disabled, inputProps = {}, onChange, ...props }) => React.createElement(
    'label',
    null,
    React.createElement('input', {
      ...props,
      ...inputProps,
      checked,
      disabled,
      onChange,
      type: 'checkbox',
    }),
    children
  );

  return {
    Box: Primitive,
    Button: ({ children, variant, ...props }) => React.createElement('button', {
      type: 'button',
      ...props,
    }, children),
    Checkbox,
    Flex: Primitive,
    Grid: Primitive,
    Modal,
    ModalBody: Primitive,
    ModalContent: Primitive,
    ModalFooter: Primitive,
    ModalHeader: Primitive,
    ModalOverlay: Primitive,
  };
});

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

describe('Workspace widget manager', () => {
  test('filters controller-specific widgets and keeps the draft controlled by the manager', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const view = render(<WidgetManager onClose={onClose} onSave={onSave} />);

    expect(screen.getByText('Grbl Widget')).toBeInTheDocument();
    expect(screen.queryByText('Marlin Widget')).not.toBeInTheDocument();
    expect(screen.queryByText('Smoothie Widget')).not.toBeInTheDocument();
    expect(screen.queryByText('TinyG Widget')).not.toBeInTheDocument();

    const consoleCheckbox = screen.getByRole('checkbox', { name: 'Console Widget' });
    fireEvent.click(consoleCheckbox);
    expect(consoleCheckbox).toBeChecked();

    view.rerender(<WidgetManager onClose={onClose} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].activeWidgets).toEqual([
      'visualizer',
      'connection',
      'console',
      'grbl',
      'axes',
    ]);
    expect(onSave.mock.calls[0][0].inactiveWidgets).toEqual([
      'gcode',
      'laser',
      'macro',
      'autolevel',
      'probe',
      'tool',
      'spindle',
      'custom',
      'webcam',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('cancels without saving and closes exactly once', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(<WidgetManager onClose={onClose} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('treats a modal close as cancel', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(<WidgetManager onClose={onClose} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('modal-close'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
