import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';

const mockUseFetchMacrosQuery = jest.fn();

jest.mock('@app/queries/macros', () => ({
  __esModule: true,
  useFetchMacrosQuery: (...args) => mockUseFetchMacrosQuery(...args),
}));

jest.mock('@app/lib/portal', () => jest.fn());
jest.mock('@app/lib/iframe-export', () => jest.fn());
jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: text => text },
}));
jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('react-redux', () => ({
  __esModule: true,
  connect: () => Component => Component,
}));

const Macro = require('../Macro').default;

const renderMacro = () => {
  const client = createTestQueryClient();
  const view = render(
    <Macro canLoadMacro={true} canRunMacro={true} />,
    { wrapper: createTestWrapper(client) },
  );
  return {
    ...view,
    dispose: () => {
      view.unmount();
      client.clear();
    },
  };
};

describe('Macro shared query view', () => {
  afterEach(() => {
    mockUseFetchMacrosQuery.mockReset();
  });

  test('shows initial loading without records', () => {
    mockUseFetchMacrosQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });
    const view = renderMacro();

    try {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test('shows an empty state for a successful empty list', () => {
    mockUseFetchMacrosQuery.mockReturnValue({
      data: { records: [] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const view = renderMacro();

    try {
      expect(screen.getByText('No macros available')).toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test('keeps visible rows while showing a background error', () => {
    mockUseFetchMacrosQuery.mockReturnValue({
      data: { records: [{ id: 'm1', name: 'Fixture Macro' }] },
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });
    const view = renderMacro();

    try {
      expect(screen.getByText('Fixture Macro')).toBeInTheDocument();
      expect(screen.getByText('An error occurred while fetching data.')).toBeInTheDocument();
    } finally {
      view.dispose();
    }
  });

  test('refreshes through the shared query observer', () => {
    const refetch = jest.fn();
    mockUseFetchMacrosQuery.mockReturnValue({
      data: { records: [{ id: 'm1', name: 'Fixture Macro' }] },
      isLoading: false,
      isError: false,
      refetch,
    });
    const view = renderMacro();

    try {
      fireEvent.click(screen.getByTitle('Refresh'));
      expect(refetch).toHaveBeenCalledTimes(1);
    } finally {
      view.dispose();
    }
  });
});
