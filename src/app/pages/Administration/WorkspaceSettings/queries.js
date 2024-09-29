import { useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

const useSystemInformationQuery = (options) => {
  return useQuery({
    queryKey: ['api/system/info'],
    queryFn: async () => {
      const url = 'api/system/info';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

export {
  useSystemInformationQuery,
};
