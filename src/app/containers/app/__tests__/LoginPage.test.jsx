import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderAppUI } from '@app/test/render';

const mockMutateAsync = jest.fn();
const mockUseSigninMutation = jest.fn(() => ({
  isLoading: false,
  mutateAsync: mockMutateAsync,
}));
const mockControllerConnect = jest.fn((host, options, callback) => callback());
const mockController = {
  connect: mockControllerConnect,
  disconnect: jest.fn(),
};

jest.mock('@app/queries/session', () => ({
  __esModule: true,
  useSigninMutation: mockUseSigninMutation,
}));

jest.mock('@app/lib/user', () => ({
  __esModule: true,
  isAuthenticated: jest.fn(() => false),
  signin: jest.fn(),
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));

jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({
      data: { allowAnonymousUsageDataCollection: false },
    })),
  },
}));

jest.mock('@app/lib/analytics', () => ({
  initialize: jest.fn(),
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
  },
}));

jest.mock('@app/lib/log', () => ({
  debug: jest.fn(),
}));

jest.mock('@app/config/settings', () => ({
  productName: 'CNCjs',
}));

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => 'session-token'),
  },
}));

const LoginPage = require('../LoginPage').default;

const renderLogin = () => renderAppUI(
  <MemoryRouter>
    <LoginPage />
  </MemoryRouter>
);

describe('LoginPage session mutation boundary', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockUseSigninMutation.mockClear();
    mockControllerConnect.mockClear();
  });

  test('uses mutateAsync and preserves the authenticated connection flow', async () => {
    mockMutateAsync.mockResolvedValue({ authenticated: true, token: 'session-token' });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({
      name: 'user',
      password: 'password',
    }));
    await waitFor(() => expect(mockControllerConnect).toHaveBeenCalledWith(
      '',
      { query: 'token=session-token' },
      expect.any(Function)
    ));
  });

  test('keeps the login page in an error state after authentication failure', async () => {
    mockMutateAsync.mockResolvedValue({ authenticated: false, token: null });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Authentication failed.')).toBeInTheDocument();
    expect(mockControllerConnect).not.toHaveBeenCalled();
  });

  test('does not submit twice while the first mutation is pending', async () => {
    mockMutateAsync.mockReturnValue(new Promise(() => {}));

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'user' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
  });

  test('links required errors and blocks invalid keyboard sign-in', async () => {
    const user = userEvent.setup();
    renderLogin();

    const name = screen.getByRole('textbox', { name: 'Username' });
    const password = screen.getByLabelText('Password');
    fireEvent.blur(name);
    fireEvent.blur(password);

    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    expect(password).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'Sign In' });
    submit.focus();
    await user.keyboard('{Enter}');
    const errors = await screen.findAllByRole('alert');
    expect(errors).toHaveLength(2);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(name.getAttribute('aria-describedby')).toContain(errors[0].id);
    expect(password.getAttribute('aria-describedby')).toContain(errors[1].id);

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

test('post-signin state read goes through Query and enables analytics only after success', async () => {
  const axios = require('@app/api/axios').default;
  const analytics = require('@app/lib/analytics');
  axios.get.mockResolvedValueOnce({ data: { allowAnonymousUsageDataCollection: true } });
  mockMutateAsync.mockResolvedValue({ authenticated: true, token: 'session-token' });
  const view = renderLogin();
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  await waitFor(() => expect(mockControllerConnect).toHaveBeenCalledTimes(1));
  expect(axios.get).toHaveBeenCalledWith('api/state');
  expect(analytics.initialize).toHaveBeenCalledTimes(1);
  expect(view.queryClient.getQueryData(['api/state'])).toEqual({ allowAnonymousUsageDataCollection: true });
});

test('failed post-signin state read releases pending state and does not connect or retry', async () => {
  const axios = require('@app/api/axios').default;
  axios.get.mockRejectedValueOnce(new Error('state unavailable'));
  mockMutateAsync.mockResolvedValue({ authenticated: true, token: 'session-token' });
  renderLogin();
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByText('An error occurred while fetching data.')).toBeInTheDocument();
  expect(mockControllerConnect).not.toHaveBeenCalled();
  expect(require('@app/lib/analytics').initialize).not.toHaveBeenCalled();
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Sign In' })).not.toBeDisabled();
});

beforeEach(() => {
  mockMutateAsync.mockReset();
  mockControllerConnect.mockClear();
  const axios = require('@app/api/axios').default;
  axios.get.mockReset().mockResolvedValue({ data: { allowAnonymousUsageDataCollection: false } });
});
