import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('../Probe', () => () => <div>Probe form</div>);

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

const ProbeWidget = require('../index').default;

test('keeps the widget view controlled by the host', () => {
  const onViewChange = jest.fn();

  renderAppUI(
    <ProbeWidget
      widgetId="probe"
      onFork={jest.fn()}
      onRemove={jest.fn()}
      view="normal"
      onViewChange={onViewChange}
      sortable={{ handleClassName: '', filterClassName: '' }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));

  expect(onViewChange).toHaveBeenCalledWith('collapsed');
});
