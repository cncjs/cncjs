import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonicProvider } from '@tonic-ui/react';

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, cacheTime: 0 },
    mutations: { retry: false },
  },
});

export const createTestWrapper = (client) => {
  return function TestProviders({ children }) {
    return (
      <QueryClientProvider client={client}>
        <TonicProvider>{children}</TonicProvider>
      </QueryClientProvider>
    );
  };
};

export const renderAppUI = (ui, options = {}) => {
  const client = createTestQueryClient();
  const result = render(ui, { wrapper: createTestWrapper(client), ...options });
  return {
    ...result,
    queryClient: client,
    dispose: () => {
      result.unmount();
      client.clear();
    },
  };
};
