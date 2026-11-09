import { act, renderHook, waitFor } from '@testing-library/react';
import api from '@app/api';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';
import { MDI_QUERY_KEY, useMdiQuery, useSaveMdiMutation } from '../queries';

jest.mock('@app/api', () => ({
  __esModule: true,
  default: {
    mdi: {
      fetch: jest.fn(),
      bulkUpdate: jest.fn(),
    },
  },
}));

const renderWithClient = (callback, client = createTestQueryClient()) => {
  const view = renderHook(callback, {
    wrapper: createTestWrapper(client),
  });

  return { client, view };
};

describe('Axes MDI query contract', () => {
  beforeEach(() => {
    api.mdi.fetch.mockReset();
    api.mdi.bulkUpdate.mockReset();
  });

  test('fetches MDI records once and returns the response body', async () => {
    const payload = { records: [{ id: 'mdi-1', name: 'Home' }] };
    api.mdi.fetch.mockResolvedValue({ body: payload });
    const { client, view } = renderWithClient(() => useMdiQuery());

    try {
      await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
      expect(view.result.current.data).toEqual(payload);
      expect(api.mdi.fetch).toHaveBeenCalledTimes(1);
      expect(client.getQueryData(MDI_QUERY_KEY)).toEqual(payload);
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('saves records with one PUT and invalidates after success', async () => {
    const payload = { status: 'ok' };
    const records = [{ id: 'mdi-1', name: 'Home' }];
    api.mdi.bulkUpdate.mockResolvedValue({ body: payload });
    const client = createTestQueryClient();
    client.invalidateQueries = jest.fn(() => Promise.resolve());
    const { view } = renderWithClient(() => useSaveMdiMutation(), client);

    try {
      let result;
      await act(async () => {
        result = await view.result.current.mutateAsync({ records });
      });
      expect(result).toEqual(payload);
      expect(api.mdi.bulkUpdate).toHaveBeenCalledWith({ records });
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: MDI_QUERY_KEY });
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('does not invalidate the query when saving fails', async () => {
    const error = new Error('save failed');
    api.mdi.bulkUpdate.mockRejectedValue(error);
    const client = createTestQueryClient();
    client.invalidateQueries = jest.fn(() => Promise.resolve());
    const { view } = renderWithClient(() => useSaveMdiMutation(), client);

    try {
      await expect(view.result.current.mutateAsync({ records: [] })).rejects.toBe(error);
      expect(client.invalidateQueries).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      client.clear();
    }
  });
});
