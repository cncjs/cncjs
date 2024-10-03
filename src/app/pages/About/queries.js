import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const API_STATE_QUERY_KEY = ['api/state'];
export const API_VERSION_LATEST_QUERY_KEY = ['api/version/latest'];

const useGetLatestVersionQuery = (options) => {
  return useQuery({
    queryKey: API_VERSION_LATEST_QUERY_KEY,
    queryFn: async () => {
      const url = 'api/version/latest';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useGetStateQuery = (options) => {
  return useQuery({
    queryKey: API_STATE_QUERY_KEY,
    queryFn: async () => {
      const url = 'api/state';
      const response = await axios.get(url);
      return response.data;
    },
    ...options
  });
};

const useSetStateMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/state';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options
  });
};

export {
  useGetLatestVersionQuery,
  useGetStateQuery,
  useSetStateMutation,
};
