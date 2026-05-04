// @ts-check
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/entities/user/user-slice';

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});
