import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@app/api';

const queryKeyFactory = {
  state: ['state'],
};

const useGeneralSettingsQuery = (options) => {
  return useQuery({
    queryKey: queryKeyFactory.state,
    queryFn: () => api.getState(),
    ...options,
  });
};

const useGeneralSettingsMutation = (options) => {
  return useMutation({
    mutationFn: ({ data }) => api.setState(data),
    ...options,
  });
};

export {
  useGeneralSettingsQuery,
  useGeneralSettingsMutation,
};
