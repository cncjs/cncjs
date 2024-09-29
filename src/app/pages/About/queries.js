import { useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

const useLatestVersionQuery = (options) => {
  return useQuery({
    queryKey: ['version/latest'],
    queryFn: async (config) => {
      const url = 'api/version/latest';
      const response = await axios.get(url, config);
      return response.data;
    },
    ...options,
  });
};

export {
  useLatestVersionQuery,
};
