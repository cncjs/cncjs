import React from 'react';
import {
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';

const mockNotifyToast = jest.fn();
const mockMutate = jest.fn();
const mockQuery = {
  data: {
    controller: {
      exception: {
        ignoreErrors: false,
      },
    },
    allowAnonymousUsageDataCollection: false,
  },
  error: null,
  isFetching: false,
  isSuccess: true,
};

jest.mock('@app/hooks/useToast', () => ({
  __esModule: true,
  default: () => mockNotifyToast,
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('../queries', () => ({
  useGeneralSettingsQuery: () => mockQuery,
  useGeneralSettingsMutation: () => ({
    isLoading: false,
    mutate: mockMutate,
  }),
}));

const GeneralSettings = require('../GeneralSettings').default;

describe('GeneralSettings form controls', () => {
  beforeEach(() => {
    mockNotifyToast.mockClear();
    mockMutate.mockClear();
  });

  test('links each checkbox to its label and submits both values from the keyboard', async () => {
    const user = userEvent.setup();
    const view = renderAppUI(<GeneralSettings />);

    try {
      const ignoreErrors = screen.getByRole('checkbox', {
        name: 'Continue execution when an error is detected in the G-code program',
      });
      const usageData = screen.getByRole('checkbox', {
        name: 'Allow anonymous usage data collection',
      });
      expect(ignoreErrors).not.toBeChecked();
      expect(usageData).not.toBeChecked();

      ignoreErrors.focus();
      await user.keyboard(' ');
      expect(ignoreErrors).toBeChecked();

      const save = screen.getByRole('button', { name: 'Save' });
      save.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
      expect(mockMutate.mock.calls[0][0]).toEqual({
        data: {
          controller: {
            exception: {
              ignoreErrors: true,
            },
          },
          allowAnonymousUsageDataCollection: false,
        },
      });
    } finally {
      view.dispose();
    }
  });

  test('does not submit settings when the save button is disabled', () => {
    mockQuery.error = new Error('load failed');
    const view = renderAppUI(<GeneralSettings />);

    try {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      expect(mockMutate).not.toHaveBeenCalled();
    } finally {
      view.dispose();
      mockQuery.error = null;
    }
  });
});
