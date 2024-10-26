import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const API_MACHINES_QUERY_KEY = ['api/machines'];

const useFetchMachinesQuery = (options) => {
  const query = options?.meta?.query;
  return useQuery({
    queryKey: [...API_MACHINES_QUERY_KEY, query].filter(Boolean),
    queryFn: async ({ queryKey, meta }) => {
      const url = meta.query
        ? 'api/machines?' + meta.query
        : 'api/machines';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useBulkDeleteMachinesMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/machines/delete';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useCreateMachineMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/machines';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useReadMachineQuery = (options) => {
  return useQuery({
    queryKey: [...API_MACHINES_QUERY_KEY, options?.meta?.id],
    queryFn: async (context) => {
      const id = context?.meta?.id;
      const url = `api/machines/${id}`;
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useUpdateMachineMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta, data }) => {
      const id = meta?.id;
      const url = `api/machines/${id}`;
      const response = await axios.put(url, data);
      return response.data;
    },
    ...options,
  });
};

const useDeleteMachineMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/machines/${id}`;
      const response = await axios.delete(url);
      return response.data;
    },
    ...options,
  });
};

export {
  useFetchMachinesQuery,
  useBulkDeleteMachinesMutation,
  useCreateMachineMutation,
  useReadMachineQuery,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
};
