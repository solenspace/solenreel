// @ts-check
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/app/store';
import AuthSessionGate from '@/app/auth-session-gate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** @param {{ children: React.ReactNode }} props */
const AppProviders = ({ children }) => (
  <ReduxProvider store={store}>
    <QueryClientProvider client={queryClient}>
      <AuthSessionGate>{children}</AuthSessionGate>
    </QueryClientProvider>
  </ReduxProvider>
);

export default AppProviders;
