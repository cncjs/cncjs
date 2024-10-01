import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const API_COMMANDS_QUERY_KEY = ['api/commands'];

const useFetchCommandsQuery = (options) => {
  return useQuery({
    queryKey: API_COMMANDS_QUERY_KEY,
    queryFn: async () => {
      const url = 'api/commands';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useCreateCommandMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/commands';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useReadCommandQuery = (options) => {
  return useQuery({
    queryKey: [...API_COMMANDS_QUERY_KEY, options?.meta?.id],
    queryFn: async (context) => {
      const id = context?.meta?.id;
      const url = `api/commands/${id}`;
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useUpdateCommandMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta, data }) => {
      const id = meta?.id;
      const url = `api/commands/${id}`;
      const response = await axios.put(url, data);
      return response.data;
    },
    ...options,
  });
};

const useDeleteCommandMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/commands/${id}`;
      const response = await axios.delete(url);
      return response.data;
    },
    ...options,
  });
};

const useEnableCommandMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/commands/${id}/enable`;
      const response = await axios.post(url);
      return response.data;
    },
    ...options,
  });
};

const useDisableCommandMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/commands/${id}/disable`;
      const response = await axios.post(url);
      return response.data;
    },
    ...options,
  });
};

export {
  useFetchCommandsQuery,
  useCreateCommandMutation,
  useReadCommandQuery,
  useUpdateCommandMutation,
  useDeleteCommandMutation,
  useEnableCommandMutation,
  useDisableCommandMutation,
};
