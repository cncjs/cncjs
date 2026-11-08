import { act, renderHook, waitFor } from '@testing-library/react';
import axios from '@app/api/axios';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';
import {
  useBulkDeleteMacrosMutation,
  useCreateMacroMutation,
  useDeleteMacroMutation,
  useFetchMacrosQuery,
  useReadMacroQuery,
  useUpdateMacroMutation,
} from '../macros';

jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const renderWithClient = (callback, client = createTestQueryClient()) => {
  const view = renderHook(callback, {
    wrapper: createTestWrapper(client),
  });
  return { client, view };
};

const mutationCases = [
  {
    label: 'bulk delete',
    hook: useBulkDeleteMacrosMutation,
    variables: { data: { ids: ['m1', 'm2'] } },
    request: { method: 'post', args: ['api/macros/delete', { ids: ['m1', 'm2'] }] },
  },
  {
    label: 'create',
    hook: useCreateMacroMutation,
    variables: { data: { name: 'fixture', action: 'G0 X0' } },
    request: { method: 'post', args: ['api/macros', { name: 'fixture', action: 'G0 X0' }] },
  },
  {
    label: 'update',
    hook: useUpdateMacroMutation,
    variables: { meta: { id: 'm1' }, data: { name: 'updated', action: 'G0 X1' } },
    request: { method: 'put', args: ['api/macros/m1', { name: 'updated', action: 'G0 X1' }] },
  },
  {
    label: 'delete',
    hook: useDeleteMacroMutation,
    variables: { meta: { id: 'm1' } },
    request: { method: 'delete', args: ['api/macros/m1'] },
  },
];

describe('shared Macro query contract', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
  });

  test('returns the list payload without options and passes the abort signal', async () => {
    const payload = { records: [{ id: 'm1', name: 'fixture' }] };
    axios.get.mockResolvedValue({ data: payload });
    const { client, view } = renderWithClient(() => useFetchMacrosQuery());

    try {
      await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
      expect(view.result.current.data).toEqual(payload);
      expect(axios.get).toHaveBeenCalledWith('api/macros', {
        signal: expect.any(AbortSignal),
      });
      expect(client.getQueryData(['api/macros'])).toEqual(payload);
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('deduplicates same-key observers and keeps filtered data separate', async () => {
    const allPayload = { records: [{ id: 'm1' }] };
    const filteredPayload = { records: [{ id: 'm2' }] };
    axios.get
      .mockResolvedValueOnce({ data: allPayload })
      .mockResolvedValueOnce({ data: filteredPayload });
    const { client, view } = renderWithClient(() => ([
      useFetchMacrosQuery(),
      useFetchMacrosQuery(),
      useFetchMacrosQuery({ meta: { query: 'paging=true' } }),
    ]));

    try {
      await waitFor(() => {
        expect(view.result.current[0].isSuccess).toBe(true);
        expect(view.result.current[2].isSuccess).toBe(true);
      });
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenNthCalledWith(1, 'api/macros', {
        signal: expect.any(AbortSignal),
      });
      expect(axios.get).toHaveBeenNthCalledWith(2, 'api/macros?paging=true', {
        signal: expect.any(AbortSignal),
      });
      expect(client.getQueryData(['api/macros'])).toEqual(allPayload);
      expect(client.getQueryData(['api/macros', 'paging=true'])).toEqual(filteredPayload);
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('does not allow options to replace the shared list key or query function', async () => {
    const payload = { records: [{ id: 'm1' }] };
    const overriddenQueryFn = jest.fn(() => {
      throw new Error('shared query function was replaced');
    });
    axios.get.mockResolvedValue({ data: payload });
    const { client, view } = renderWithClient(() => useFetchMacrosQuery({
      queryKey: ['wrong-key'],
      queryFn: overriddenQueryFn,
      select: data => data.records,
    }));

    try {
      await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
      expect(view.result.current.data).toEqual(payload.records);
      expect(overriddenQueryFn).not.toHaveBeenCalled();
      expect(client.getQueryData(['api/macros'])).toEqual(payload);
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('disables detail queries without an id and never requests undefined', () => {
    const { client, view } = renderWithClient(() => useReadMacroQuery());

    expect(view.result.current.fetchStatus).toBe('idle');
    expect(axios.get).not.toHaveBeenCalled();
    view.unmount();
    client.clear();
  });

  test('does not repopulate cleared cache from a late cancelled request', async () => {
    let resolveRequest;
    axios.get.mockImplementation(() => new Promise(resolve => {
      resolveRequest = resolve;
    }));
    const { client, view } = renderWithClient(() => useFetchMacrosQuery());

    try {
      await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
      await client.cancelQueries({ queryKey: ['api/macros'] });
      client.clear();
      resolveRequest({ data: { records: [{ id: 'old-user' }] } });
      await Promise.resolve();
      expect(client.getQueryData(['api/macros'])).toBeUndefined();
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('refreshes widget and Administration observers after a shared mutation', async () => {
    const initialWidgetPayload = { records: [{ id: 'm1', name: 'initial' }] };
    const initialAdministrationPayload = {
      records: [{ id: 'm1', name: 'initial' }],
      pagination: { totalRecords: 1 },
    };
    const updatedWidgetPayload = { records: [{ id: 'm1', name: 'updated' }] };
    const updatedAdministrationPayload = {
      records: [{ id: 'm1', name: 'updated' }],
      pagination: { totalRecords: 1 },
    };
    const requestCounts = {
      widget: 0,
      administration: 0,
    };
    axios.get.mockImplementation((url) => {
      if (url === 'api/macros') {
        const data = requestCounts.widget++ === 0
          ? initialWidgetPayload
          : updatedWidgetPayload;
        return Promise.resolve({ data });
      }

      const data = requestCounts.administration++ === 0
        ? initialAdministrationPayload
        : updatedAdministrationPayload;
      return Promise.resolve({ data });
    });
    axios.post.mockResolvedValue({ data: { status: 'ok' } });
    const client = createTestQueryClient();
    const widgetView = renderHook(() => useFetchMacrosQuery(), {
      wrapper: createTestWrapper(client),
    });
    const administrationView = renderHook(() => useFetchMacrosQuery({
      meta: { query: 'paging=true' },
    }), {
      wrapper: createTestWrapper(client),
    });
    const mutationView = renderHook(() => useCreateMacroMutation(), {
      wrapper: createTestWrapper(client),
    });

    try {
      await waitFor(() => {
        expect(widgetView.result.current.isSuccess).toBe(true);
        expect(administrationView.result.current.isSuccess).toBe(true);
      });
      await act(async () => {
        await mutationView.result.current.mutateAsync({
          data: { name: 'updated', action: 'G0 X1' },
        });
      });
      await waitFor(() => {
        expect(requestCounts).toEqual({ widget: 2, administration: 2 });
      });
      expect(client.getQueryData(['api/macros'])).toEqual(updatedWidgetPayload);
      expect(client.getQueryData(['api/macros', 'paging=true'])).toEqual(updatedAdministrationPayload);
    } finally {
      widgetView.unmount();
      administrationView.unmount();
      mutationView.unmount();
      client.clear();
    }
  });

  test.each(mutationCases)('$label returns data and invalidates before caller onSuccess', async ({ hook, variables, request }) => {
    const payload = { status: 'ok' };
    const calls = [];
    const onSuccess = jest.fn((...args) => {
      calls.push('caller');
      return args;
    });
    const client = createTestQueryClient();
    client.invalidateQueries = jest.fn(({ queryKey }) => {
      expect(queryKey).toEqual(['api/macros']);
      calls.push('invalidate');
      return Promise.resolve();
    });
    axios[request.method].mockResolvedValue({ data: payload });
    const view = renderHook(() => hook({ onSuccess }), {
      wrapper: createTestWrapper(client),
    });

    try {
      let result;
      await act(async () => {
        result = await view.result.current.mutateAsync(variables);
      });
      expect(result).toEqual(payload);
      expect(axios[request.method]).toHaveBeenCalledWith(...request.args);
      expect(calls).toEqual(['invalidate', 'caller']);
      expect(onSuccess).toHaveBeenCalledWith(payload, variables, undefined);
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test.each(mutationCases)('$label does not retry when a caller requests retry', async ({ hook, variables, request }) => {
    const error = new Error('request failed');
    const onSuccess = jest.fn();
    const client = createTestQueryClient();
    client.invalidateQueries = jest.fn();
    axios[request.method].mockRejectedValue(error);
    const view = renderHook(() => hook({ retry: true, onSuccess }), {
      wrapper: createTestWrapper(client),
    });

    try {
      await act(async () => {
        await expect(view.result.current.mutateAsync(variables))
          .rejects.toThrow('request failed');
      });
      expect(axios[request.method]).toHaveBeenCalledTimes(1);
      expect(client.invalidateQueries).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('does not invalidate or call success after a failed mutation', async () => {
    const error = new Error('request failed');
    axios.post.mockRejectedValue(error);
    const onSuccess = jest.fn();
    const client = createTestQueryClient();
    client.invalidateQueries = jest.fn();
    const view = renderHook(() => useCreateMacroMutation({ onSuccess }), {
      wrapper: createTestWrapper(client),
    });

    try {
      await act(async () => {
        await expect(view.result.current.mutateAsync({ data: { name: 'fixture' } }))
          .rejects.toThrow('request failed');
      });
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(client.invalidateQueries).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      client.clear();
    }
  });
});
