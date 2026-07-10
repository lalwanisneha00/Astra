import { create } from 'zustand'

/** The Earth-to-Universe Level-1 (naked-eye) baseline FOV — used both as
 * the camera's initial field of view and to reset zoom back to the
 * baseline whenever Today's Night Sky (re)establishes a fresh observer,
 * so the very first view it shows is always "what's naturally visible
 * from here, right now," matching Explore Mode's own starting point. */
export const DEFAULT_FOV = 75

interface FlyToTarget {
  ra: number
  dec: number
}

interface SceneStore {
  /** Current camera field of view, in degrees. */
  fov: number
  /** FOV the camera is easing towards (set by zoom input). */
  targetFov: number
  hoveredObjectId: string | null
  flyToTarget: FlyToTarget | null
  setFov: (fov: number) => void
  setTargetFov: (fov: number) => void
  setHoveredObjectId: (id: string | null) => void
  setFlyToTarget: (target: FlyToTarget | null) => void
}

/**
 * Camera and hover state for the 3D scene. Read imperatively (via
 * `useSceneStore.getState()`) inside the render loop where possible, so
 * high-frequency updates (camera orientation, hover) don't force React
 * re-renders every frame.
 */
export const useSceneStore = create<SceneStore>((set) => ({
  fov: DEFAULT_FOV,
  targetFov: DEFAULT_FOV,
  hoveredObjectId: null,
  flyToTarget: null,
  setFov: (fov) => set({ fov }),
  setTargetFov: (targetFov) => set({ targetFov }),
  setHoveredObjectId: (hoveredObjectId) => set({ hoveredObjectId }),
  setFlyToTarget: (flyToTarget) => set({ flyToTarget }),
}))
