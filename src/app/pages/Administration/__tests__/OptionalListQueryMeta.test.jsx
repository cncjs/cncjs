import { renderHook, waitFor } from '@testing-library/react';
import axios from '@app/api/axios';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';
import { useFetchCommandsQuery } from '../Commands/queries';
import { useFetchEventsQuery } from '../Events/queries';
import { useFetchMachinesQuery } from '../Machines/queries';
import { useFetchUsersQuery } from '../Users/queries';

jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const listQueries = [
  ['commands', useFetchCommandsQuery],
  ['events', useFetchEventsQuery],
  ['machines', useFetchMachinesQuery],
  ['users', useFetchUsersQuery],
];

beforeEach(() => {
  axios.get.mockReset();
  axios.get.mockResolvedValue({ data: { records: [] } });
});

test.each(listQueries)('%s list query supports callers without meta options', async (resource, useListQuery) => {
  const queryClient = createTestQueryClient();
  const { result, unmount } = renderHook(() => useListQuery(), {
    wrapper: createTestWrapper(queryClient),
  });

  try {
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ records: [] });
    expect(axios.get).toHaveBeenCalledWith(`api/${resource}`);
  } finally {
    unmount();
    queryClient.clear();
  }
});
