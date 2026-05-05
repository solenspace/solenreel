// @ts-check
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import userReducer from '@/entities/user/user-slice';

const rootReducer = combineReducers({ user: userReducer });

/** @typedef {Partial<ReturnType<typeof rootReducer>>} TestPreloadedState */

/** @param {{ preloadedState?: TestPreloadedState }} [opts] */
export const createTestStore = (opts = {}) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: opts.preloadedState,
  });

/**
 * @param {{
 *   store?: ReturnType<typeof createTestStore>,
 *   preloadedState?: TestPreloadedState,
 *   children: React.ReactNode,
 * }} props
 */
export const ReduxWrapper = ({ store, preloadedState, children }) => {
  const s = store ?? createTestStore({ preloadedState });
  return <Provider store={s}>{children}</Provider>;
};

/** @param {React.ReactNode} children */
export const withRedux = (children) => <ReduxWrapper>{children}</ReduxWrapper>;
