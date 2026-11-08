import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const API_MACROS_QUERY_KEY = ['api/macros'];

export const useFetchMacrosQuery = (options = {}) => {
  const query = options.meta?.query;
  return useQuery({
    ...options,
    queryKey: [...API_MACROS_QUERY_KEY, query].filter(Boolean),
    queryFn: async ({ signal }) => {
      const url = query
        ? 'api/macros?' + query
        : 'api/macros';
      const response = await axios.get(url, { signal });
      return response.data;
    },
  });
};

export const useBulkDeleteMacrosMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    ...rest,
    retry: false,
    mutationFn: async ({ data }) => {
      const response = await axios.post('api/macros/delete', data);
      return response.data;
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: API_MACROS_QUERY_KEY });
      return onSuccess?.(data, variables, context);
    },
  });
};

export const useCreateMacroMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    ...rest,
    retry: false,
    mutationFn: async ({ data }) => {
      const response = await axios.post('api/macros', data);
      return response.data;
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: API_MACROS_QUERY_KEY });
      return onSuccess?.(data, variables, context);
    },
  });
};

export const useReadMacroQuery = (options = {}) => {
  const id = options.meta?.id;
  return useQuery({
    ...options,
    queryKey: [...API_MACROS_QUERY_KEY, 'detail', id].filter(Boolean),
    enabled: Boolean(id) && options.enabled !== false,
    queryFn: async ({ signal }) => {
      const response = await axios.get(`api/macros/${id}`, { signal });
      return response.data;
    },
  });
};

export const useUpdateMacroMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    ...rest,
    retry: false,
    mutationFn: async ({ meta, data }) => {
      const id = meta?.id;
      const response = await axios.put(`api/macros/${id}`, data);
      return response.data;
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: API_MACROS_QUERY_KEY });
      return onSuccess?.(data, variables, context);
    },
  });
};

export const useDeleteMacroMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    ...rest,
    retry: false,
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const response = await axios.delete(`api/macros/${id}`);
      return response.data;
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: API_MACROS_QUERY_KEY });
      return onSuccess?.(data, variables, context);
    },
  });
};
