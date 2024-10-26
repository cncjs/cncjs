import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const API_MACROS_QUERY_KEY = ['api/macros'];

const useFetchMacrosQuery = (options) => {
  const query = options?.meta?.query;
  return useQuery({
    queryKey: [...API_MACROS_QUERY_KEY, query].filter(Boolean),
    queryFn: async ({ queryKey, meta }) => {
      const url = meta.query
        ? 'api/macros?' + meta.query
        : 'api/macros';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useBulkDeleteMacrosMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/macros/delete';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useCreateMacroMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/macros';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useReadMacroQuery = (options) => {
  return useQuery({
    queryKey: [...API_MACROS_QUERY_KEY, options?.meta?.id],
    queryFn: async (context) => {
      const id = context?.meta?.id;
      const url = `api/macros/${id}`;
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useUpdateMacroMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta, data }) => {
      const id = meta?.id;
      const url = `api/macros/${id}`;
      const response = await axios.put(url, data);
      return response.data;
    },
    ...options,
  });
};

const useDeleteMacroMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/macros/${id}`;
      const response = await axios.delete(url);
      return response.data;
    },
    ...options,
  });
};

export {
  useFetchMacrosQuery,
  useBulkDeleteMacrosMutation,
  useCreateMacroMutation,
  useReadMacroQuery,
  useUpdateMacroMutation,
  useDeleteMacroMutation,
};
