// @ts-check
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/entities/user/user-slice';
import hoverReducer from '@/features/trailer/hover-store';

export const store = configureStore({
  reducer: {
    user: userReducer,
    hover: hoverReducer,
  },
});
