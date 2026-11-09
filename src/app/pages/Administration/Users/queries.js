import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const API_USERS_QUERY_KEY = ['api/users'];

const useFetchUsersQuery = (options) => {
  const query = options?.meta?.query;
  return useQuery({
    queryKey: [...API_USERS_QUERY_KEY, query].filter(Boolean),
    queryFn: async ({ meta }) => {
      const query = meta?.query;
      const url = query
        ? 'api/users?' + query
        : 'api/users';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useBulkDeleteUsersMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/users/delete';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useBulkEnableUsersMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/users/enable';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useBulkDisableUsersMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/users/disable';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useCreateUserMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/users';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

const useReadUserQuery = (options) => {
  return useQuery({
    queryKey: [...API_USERS_QUERY_KEY, options?.meta?.id],
    queryFn: async (context) => {
      const id = context?.meta?.id;
      const url = `api/users/${id}`;
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useUpdateUserMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta, data }) => {
      const id = meta?.id;
      const url = `api/users/${id}`;
      const response = await axios.put(url, data);
      return response.data;
    },
    ...options,
  });
};

const useDeleteUserMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/users/${id}`;
      const response = await axios.delete(url);
      return response.data;
    },
    ...options,
  });
};

const useEnableUserMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/users/${id}/enable`;
      const response = await axios.post(url);
      return response.data;
    },
    ...options,
  });
};

const useDisableUserMutation = (options) => {
  return useMutation({
    mutationFn: async ({ meta }) => {
      const id = meta?.id;
      const url = `api/users/${id}/disable`;
      const response = await axios.post(url);
      return response.data;
    },
    ...options,
  });
};

export {
  useFetchUsersQuery,
  useBulkDeleteUsersMutation,
  useBulkEnableUsersMutation,
  useBulkDisableUsersMutation,
  useCreateUserMutation,
  useReadUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useEnableUserMutation,
  useDisableUserMutation,
};
