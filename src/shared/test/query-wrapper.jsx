// @ts-check
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

/** @param {{ client?: import('@tanstack/react-query').QueryClient, children: React.ReactNode }} props */
export const QueryWrapper = ({ client, children }) => {
  const qc = client ?? createTestQueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

/** @param {React.ReactNode} children */
export const withQuery = (children) => <QueryWrapper>{children}</QueryWrapper>;
