// @ts-check
import { createSlice } from '@reduxjs/toolkit';

/**
 * @typedef {{ email: string | null, uid?: string, displayName?: string | null } | null} AppUser
 * @typedef {{ user: AppUser }} UserState
 */

/** @type {UserState} */
const initialState = {
  user: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /**
     * @param {UserState} state
     * @param {{ payload: AppUser }} action
     */
    login: (state, action) => {
      state.user = action.payload;
    },
    /** @param {UserState} state */
    logout: (state) => {
      state.user = null;
    },
  },
});

export const { login, logout } = userSlice.actions;

/** @param {{ user: UserState }} state */
export const selectUser = (state) => state.user.user;

export default userSlice.reducer;
