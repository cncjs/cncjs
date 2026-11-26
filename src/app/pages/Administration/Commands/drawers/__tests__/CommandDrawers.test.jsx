import React from 'react';
import {
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockNotifyToast = jest.fn();
const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();
const mockSavedCommand = { id: '1', enabled: true, name: 'Saved command', action: 'M3 S1000' };
let mockCommandQuery;

jest.mock('@app/hooks/useToast', () => ({
  __esModule: true,
  default: () => mockNotifyToast,
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('../../queries', () => ({
  API_COMMANDS_QUERY_KEY: ['api/commands'],
  useCreateCommandMutation: () => ({ isLoading: false, mutate: mockCreateMutate }),
  useReadCommandQuery: () => mockCommandQuery,
  useUpdateCommandMutation: () => ({ isLoading: false, mutate: mockUpdateMutate }),
}));

const CreateCommandDrawer = require('../CreateCommandDrawer').default;
const UpdateCommandDrawer = require('../UpdateCommandDrawer').default;

describe('Command drawer validation timing', () => {
  beforeEach(() => {
    mockCreateMutate.mockClear();
    mockUpdateMutate.mockClear();
    mockCommandQuery = { data: mockSavedCommand, isFetching: false, isError: false };
  });

  test('create: fields are valid on open; required errors appear only after submit', async () => {
    const view = renderAppUI(<CreateCommandDrawer onClose={jest.fn()} />);

    try {
      const name = screen.getByPlaceholderText('e.g., Activate Air Purifier');
      const action = screen.getByPlaceholderText('/home/cncjs/bin/activate-air-purifier');

      // On open the form must not show an invalid state (the reported bug).
      expect(name).not.toHaveAttribute('aria-invalid', 'true');
      expect(action).not.toHaveAttribute('aria-invalid', 'true');
      expect(name).not.toHaveAttribute('required');
      expect(action).not.toHaveAttribute('required');
      expect(name.validity.valid).toBe(true);
      expect(action.validity.valid).toBe(true);

      // Submit with empty values: the required rules fire and no mutation is sent.
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      await waitFor(() => {
        expect(name).toHaveAttribute('aria-invalid', 'true');
        expect(action).toHaveAttribute('aria-invalid', 'true');
      });
      expect(mockCreateMutate).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  });

  test('create: clicking Add submits valid values once', async () => {
    const view = renderAppUI(<CreateCommandDrawer onClose={jest.fn()} />);

    try {
      fireEvent.change(screen.getByPlaceholderText('e.g., Activate Air Purifier'), {
        target: { value: 'Start purifier' },
      });
      fireEvent.change(screen.getByPlaceholderText('/home/cncjs/bin/activate-air-purifier'), {
        target: { value: '/usr/bin/start-purifier' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledTimes(1));
      expect(mockCreateMutate).toHaveBeenCalledWith({
        data: {
          enabled: true,
          name: 'Start purifier',
          action: '/usr/bin/start-purifier',
        },
      });
    } finally {
      view.dispose();
    }
  });

  test('edit: clicking Save submits updated values once', async () => {
    const view = renderAppUI(<UpdateCommandDrawer id="1" onClose={jest.fn()} />);

    try {
      const name = screen.getByPlaceholderText('e.g., Activate Air Purifier');
      await waitFor(() => expect(name).toHaveValue('Saved command'));
      fireEvent.change(name, { target: { value: 'Updated command' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        meta: { id: '1' },
        data: {
          enabled: true,
          name: 'Updated command',
          action: 'M3 S1000',
        },
      });
    } finally {
      view.dispose();
    }
  });

  test('edit: no invalid state flashes when the record loads', async () => {
    mockCommandQuery = { data: undefined, isFetching: true, isError: false };
    const view = renderAppUI(<UpdateCommandDrawer id="1" onClose={jest.fn()} />);

    try {
      expect(screen.getByRole('progressbar')).toBeVisible();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      mockCommandQuery = { data: mockSavedCommand, isFetching: false, isError: false };
      view.rerender(<UpdateCommandDrawer id="1" onClose={jest.fn()} />);
      const name = screen.getByPlaceholderText('e.g., Activate Air Purifier');
      const action = screen.getByPlaceholderText('/home/cncjs/bin/activate-air-purifier');
      expect(name.validity.valid).toBe(true);
      expect(action.validity.valid).toBe(true);

      // Once the record loads the field is populated and remains valid.
      await waitFor(() => expect(name).toHaveValue('Saved command'));
      expect(name).not.toHaveAttribute('aria-invalid', 'true');
      expect(action).toHaveValue('M3 S1000');
      expect(action).not.toHaveAttribute('aria-invalid', 'true');
      expect(mockUpdateMutate).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  });
});
