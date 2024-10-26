import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const API_EVENTS_QUERY_KEY = ['api/events'];

const useFetchEventsQuery = (options) => {
  const query = options?.meta?.query;
  return useQuery({
    queryKey: [...API_EVENTS_QUERY_KEY, query].filter(Boolean),
    queryFn: async ({ queryKey, meta }) => {
      const url = meta.query
        ? 'api/events?' + meta.query
        : 'api/events';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useBulkDeleteEventsMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/events/delete';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useBulkEnableEventsMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/events/enable';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useBulkDisableEventsMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/events/disable';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useCreateEventMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/events';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useReadEventQuery = (options) => {
  return useQuery({
    queryKey: [...API_EVENTS_QUERY_KEY, options?.meta?.id],
    queryFn: async (context) => {
      const id = context?.meta?.id;
      const url = `api/events/${id}`;
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useUpdateEventMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta, data }) => {
      const id = meta?.id;
      const url = `api/events/${id}`;
      const response = await axios.put(url, data);
      return response.data;
    },
    ...options,
  });
};

const useDeleteEventMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/events/${id}`;
      const response = await axios.delete(url);
      return response.data;
    },
    ...options,
  });
};

const useEnableEventMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/events/${id}/enable`;
      const response = await axios.post(url);
      return response.data;
    },
    ...options,
  });
};

const useDisableEventMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/events/${id}/disable`;
      const response = await axios.post(url);
      return response.data;
    },
    ...options,
  });
};

const useRunEventMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/events/${id}/run`;
      const response = await axios.post(url);
      return response.data;
    },
    ...options,
  });
};

export {
  useFetchEventsQuery,
  useBulkDeleteEventsMutation,
  useBulkEnableEventsMutation,
  useBulkDisableEventsMutation,
  useCreateEventMutation,
  useReadEventQuery,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useEnableEventMutation,
  useDisableEventMutation,
  useRunEventMutation,
};
