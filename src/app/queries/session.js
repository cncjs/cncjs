import { useMutation } from '@tanstack/react-query';
import { signin, signout } from '@app/lib/user';
import config from '@app/store/config';

export { signin };

export const useSigninMutation = () => useMutation({
  mutationFn: signin,
  retry: false,
});

export const clearSessionQueryCache = async (queryClient) => {
  await queryClient.cancelQueries();
  queryClient.clear();
};

export const signoutAndClearSession = async (queryClient) => {
  await signout();
  await clearSessionQueryCache(queryClient);
};

export const createSessionQueryBoundary = (queryClient, getSessionIdentity = () => config.get('session.token') || '') => {
  let previousSessionIdentity = getSessionIdentity();

  const onConfigChange = () => {
    const nextSessionIdentity = getSessionIdentity();
    if (nextSessionIdentity === previousSessionIdentity) {
      return undefined;
    }

    previousSessionIdentity = nextSessionIdentity;
    return queryClient.cancelQueries().then(() => {
      queryClient.removeQueries();
    });
  };

  config.on('change', onConfigChange);

  return () => {
    config.off('change', onConfigChange);
  };
};
