// @ts-check
import { createSlice } from '@reduxjs/toolkit';

/**
 * Single source of truth for "which tile is currently the active hover-player".
 * Spec 12 §"Performance" — only one hover-player is mounted at a time globally;
 * when a tile starts hovering, others observe the slice flip and force-unmount.
 *
 * @typedef {object} HoverState
 * @property {number | null} hoveringTileId
 */

/** @type {HoverState} */
const initialState = { hoveringTileId: null };

export const hoverSlice = createSlice({
  name: 'hover',
  initialState,
  reducers: {
    /**
     * @param {HoverState} state
     * @param {{ payload: number | null }} action
     */
    setHoveringTile: (state, action) => {
      state.hoveringTileId = action.payload;
    },
  },
});

export const { setHoveringTile } = hoverSlice.actions;

/** @param {{ hover: HoverState }} state */
export const selectHoveringTileId = (state) => state.hover.hoveringTileId;

/**
 * @param {{ hover: HoverState }} state
 * @param {number | null} id
 */
export const selectIsCurrentlyHovering = (state, id) =>
  id != null && state.hover.hoveringTileId === id;

export default hoverSlice.reducer;
