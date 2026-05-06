// @ts-check
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Spec 14: load every key from `.env*` (including non-VITE_ prefixed ones
// like SUPABASE_SERVICE_ROLE_KEY) into the test process's `process.env`.
// VITE_-prefixed keys remain available via `import.meta.env` exactly as
// before; this only widens what's reachable through `process.env`.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    css: true,
    env: loadEnv(mode || 'test', process.cwd(), ''),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
}));
