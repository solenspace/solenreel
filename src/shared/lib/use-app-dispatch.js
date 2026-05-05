// @ts-check
import { useDispatch } from 'react-redux';

/**
 * Typed dispatch hook that accepts thunks (so `dispatch(thunk).unwrap()` typechecks).
 * The state generic is `unknown` because thunks in this app don't read state through
 * the dispatch surface. State-reading happens via `useSelector` with slice-local types.
 *
 * @typedef {import('@reduxjs/toolkit').ThunkDispatch<unknown, undefined, import('@reduxjs/toolkit').UnknownAction>} AppDispatch
 */

/** @returns {AppDispatch} */
export const useAppDispatch = () => useDispatch();
