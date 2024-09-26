import { useQuery } from '@tanstack/react-query';
import api from '@app/api';

const queryKeyFactory = {
  state: ['system/info'],
};

const useSystemInformationQuery = (options) => {
  return useQuery({
    queryKey: queryKeyFactory.state,
    queryFn: () => api.getSystemInformation(),
    ...options,
  });
};

export {
  useSystemInformationQuery,
};
