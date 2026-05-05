// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}));

describe('supabase client (singleton)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('constructs the client once with URL + anon key from import.meta.env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test');

    const { createClient } = await import('@supabase/supabase-js');
    const mod = await import('./supabase');

    expect(mod.supabase).toBeDefined();
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'anon-test');
  });

  it.each([
    { setUrl: '', setKey: 'anon-test', expected: /VITE_SUPABASE_URL/ },
    { setUrl: 'https://test.supabase.co', setKey: '', expected: /VITE_SUPABASE_ANON_KEY/ },
  ])(
    'throws an explicit error when env is missing ($expected)',
    async ({ setUrl, setKey, expected }) => {
      vi.stubEnv('VITE_SUPABASE_URL', setUrl);
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', setKey);

      await expect(import('./supabase')).rejects.toThrow(expected);
    },
  );
});
