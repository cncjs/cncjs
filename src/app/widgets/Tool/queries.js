import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@app/api';

export const TOOL_CONFIG_QUERY_KEY = ['api/tool'];

/**
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export const useToolConfigQuery = () => useQuery({
  queryKey: TOOL_CONFIG_QUERY_KEY,
  retry: false,
  queryFn: async () => (await api.getToolConfig()).body,
});

/**
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useSaveToolConfigMutation = () => {
  const client = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: async data => (await api.setToolConfig(data)).body,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: TOOL_CONFIG_QUERY_KEY });
    },
  });
};
