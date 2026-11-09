import React from 'react';
import { screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import WidgetListItem from '../widget-manager/WidgetListItem';

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

describe('WidgetListItem', () => {
  test('exposes its caption as the native checkbox accessible name', () => {
    const view = renderAppUI(<WidgetListItem caption="Custom Widget" id="custom" />);
    try {
      expect(screen.getByRole('checkbox', { name: 'Custom Widget' })).toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });
});
