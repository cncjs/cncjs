import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

const Notifications = require('../Notifications').default;
const {
  NOTIFICATION_M6_TOOL_CHANGE,
  NOTIFICATION_PROGRAM_ERROR,
} = require('../constants');

test('does not render an inactive workflow notification', () => {
  const { container } = renderAppUI(
    <Notifications
      show={false}
      type={NOTIFICATION_PROGRAM_ERROR}
    />
  );

  expect(container).toBeEmptyDOMElement();
});

test('renders a dismissible error toast with the controller error detail', () => {
  const onDismiss = jest.fn();
  renderAppUI(
    <Notifications
      data="Controller alarm"
      onDismiss={onDismiss}
      type={NOTIFICATION_PROGRAM_ERROR}
    />
  );

  expect(screen.getByText('Error')).toBeInTheDocument();
  expect(screen.getByText('Controller alarm')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('retains the M6 help link in the workflow toast', () => {
  renderAppUI(
    <Notifications type={NOTIFICATION_M6_TOOL_CHANGE} />
  );

  expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
    'href',
    'https://github.com/cncjs/cncjs/wiki/Tool-Change'
  );
});
