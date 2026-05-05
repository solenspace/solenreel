// @ts-check
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/app/store';
import AuthSessionGate from '@/entities/user/auth-session-gate';
import App from '@/App';
import '@fontsource-variable/newsreader/index.css';
import '@fontsource-variable/inter/index.css';
import '@fontsource/jetbrains-mono/400.css';
import './main.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthSessionGate>
          <App />
        </AuthSessionGate>
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
);
