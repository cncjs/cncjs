import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@app/api';

export const MDI_QUERY_KEY = ['api/mdi'];

/**
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export const useMdiQuery = () => useQuery({
  queryKey: MDI_QUERY_KEY,
  retry: false,
  queryFn: async () => (await api.mdi.fetch()).body
});

/**
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useSaveMdiMutation = () => {
  const client = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: async ({ records }) => (await api.mdi.bulkUpdate({ records })).body,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: MDI_QUERY_KEY });
    }
  });
};
