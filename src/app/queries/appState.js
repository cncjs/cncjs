import { useQuery } from '@tanstack/react-query';
import axios from '@app/api/axios';

export const fetchAppState = async () => (await axios.get('api/state')).data;
export const appStateQueryOptions = {
  queryKey: ['api/state'],
  queryFn: fetchAppState,
  retry: false,
};

// Login explicitly fetches this authenticated state after sign-in succeeds.
export const useAppStateQuery = () => useQuery({ ...appStateQueryOptions, enabled: false });
