// @ts-check
import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/shared/api/supabase';

/**
 * @typedef {import('@/shared/types/auth').Session} Session
 * @typedef {import('@/shared/types/auth').AppAuthError} AppAuthError
 * @typedef {{ email: string, password: string }} Credentials
 */

/**
 * @param {unknown} err
 * @returns {AppAuthError}
 */
const normalize = (err) => {
  if (err && typeof err === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (err);
    return {
      code: typeof obj.code === 'string' ? obj.code : 'unknown',
      message: typeof obj.message === 'string' ? obj.message : 'Unknown error',
      ...(typeof obj.status === 'number' ? { status: obj.status } : {}),
    };
  }
  return { code: 'unknown', message: 'Unknown error' };
};

export const signIn = createAsyncThunk(
  'user/signIn',
  /**
   * @param {Credentials} creds
   * @param {{ rejectWithValue: (value: AppAuthError) => unknown }} thunkApi
   */
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return rejectWithValue(normalize(error));
    return /** @type {Session | null} */ (data.session);
  },
);

export const signUp = createAsyncThunk(
  'user/signUp',
  /**
   * @param {Credentials} creds
   * @param {{ rejectWithValue: (value: AppAuthError) => unknown }} thunkApi
   */
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return rejectWithValue(normalize(error));
    return /** @type {Session | null} */ (data.session);
  },
);

export const signOut = createAsyncThunk(
  'user/signOut',
  /** @param {void} _ @param {{ rejectWithValue: (value: AppAuthError) => unknown }} thunkApi */
  async (_, { rejectWithValue }) => {
    const { error } = await supabase.auth.signOut();
    if (error) return rejectWithValue(normalize(error));
    return null;
  },
);
