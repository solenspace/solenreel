// @ts-check
import { createSlice } from '@reduxjs/toolkit';
import { signIn, signUp, signOut } from '@/entities/user/auth-actions';

/**
 * @typedef {import('@/shared/types/supabase').Session} Session
 * @typedef {import('@/shared/types/supabase').AppAuthError} AppAuthError
 * @typedef {'idle' | 'loading' | 'authenticated' | 'unauthenticated'} AuthStatus
 *
 * @typedef {object} UserState
 * @property {Session | null} session
 * @property {AuthStatus} status
 * @property {AppAuthError | null} error
 */

/** @type {UserState} */
const initialState = { session: null, status: 'idle', error: null };

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /**
     * @param {UserState} state
     * @param {{ payload: Session | null }} action
     */
    setSession: (state, action) => {
      state.session = action.payload;
      state.status = action.payload ? 'authenticated' : 'unauthenticated';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signUp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signOut.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = /** @type {AppAuthError | null} */ (action.payload ?? null);
      })
      .addCase(signUp.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = /** @type {AppAuthError | null} */ (action.payload ?? null);
      })
      .addCase(signOut.rejected, (state, action) => {
        state.status = state.session ? 'authenticated' : 'unauthenticated';
        state.error = /** @type {AppAuthError | null} */ (action.payload ?? null);
      });
    // .fulfilled cases intentionally omitted — useAuthSession's onAuthStateChange
    // is the single producer of session updates (avoids dispatch race).
  },
});

export const { setSession } = userSlice.actions;

/** @param {{ user: UserState }} state */
export const selectSession = (state) => state.user.session;

/** @param {{ user: UserState }} state */
export const selectUser = (state) => state.user.session?.user ?? null;

/** @param {{ user: UserState }} state */
export const selectAuthStatus = (state) => state.user.status;

/** @param {{ user: UserState }} state */
export const selectAuthError = (state) => state.user.error;

export default userSlice.reducer;
