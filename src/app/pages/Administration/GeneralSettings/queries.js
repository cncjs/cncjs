import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

const useGeneralSettingsQuery = (options) => {
  return useQuery({
    queryKey: ['api/state'],
    queryFn: async () => {
      const url = 'api/state';
      const response = await axios.get(url);
      return response.data;
    },
    ...options,
  });
};

const useGeneralSettingsMutation = (options) => {
  return useMutation({
    mutationFn: async ({ data }) => {
      const url = 'api/state';
      const response = await axios.post(url, data);
      return response.data;
    },
    ...options,
  });
};

export {
  useGeneralSettingsQuery,
  useGeneralSettingsMutation,
};
