import { create } from 'zustand'
import type { SelectableObjectType } from './useSelectionStore'

export interface HoveredObject {
  type: SelectableObjectType
  id: string
  /** Buffer index — only meaningful (and only ever set) for stars, where
   * one shared `Points` object represents many individual stars. Lets
   * `StarsLayer` drive its `uHoveredIndex` shader uniform directly from
   * this, with no need to re-scan the catalog for a matching id on
   * every hover change. */
  index?: number
}

interface InteractionStore {
  hovered: HoveredObject | null
  setHovered: (hovered: HoveredObject | null) => void
}

/**
 * Owned exclusively by `scene/interaction/InteractionManager` — every
 * render layer only ever *reads* this (to drive its own hover
 * highlight) and never writes to it. Deliberately a separate store from
 * `useSceneStore` (camera/FOV) and `useSelectionStore` (which object's
 * info panel is open): hover is its own concern with its own lifecycle,
 * updating far more often than a selection but meaning nothing on its
 * own beyond "briefly highlight this."
 */
export const useInteractionStore = create<InteractionStore>((set) => ({
  hovered: null,
  setHovered: (hovered) => set({ hovered }),
}))
