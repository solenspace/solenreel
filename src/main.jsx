// @ts-check
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppProviders from '@/app/providers';
import App from '@/App';
import '@fontsource-variable/newsreader/index.css';
import '@fontsource-variable/inter/index.css';
import '@fontsource/jetbrains-mono/400.css';
import './main.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
