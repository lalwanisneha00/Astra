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
  flyToTarget: FlyToTarget | null
  setFov: (fov: number) => void
  setTargetFov: (fov: number) => void
  setFlyToTarget: (target: FlyToTarget | null) => void
}

/**
 * Camera state for the 3D scene. Read imperatively (via
 * `useSceneStore.getState()`) inside the render loop where possible, so
 * high-frequency updates (camera orientation) don't force React
 * re-renders every frame. Hover state lives in `useInteractionStore`,
 * not here — see scene/interaction/InteractionManager.
 */
export const useSceneStore = create<SceneStore>((set) => ({
  fov: DEFAULT_FOV,
  targetFov: DEFAULT_FOV,
  flyToTarget: null,
  setFov: (fov) => set({ fov }),
  setTargetFov: (targetFov) => set({ targetFov }),
  setFlyToTarget: (flyToTarget) => set({ flyToTarget }),
}))
