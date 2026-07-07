import { create } from 'zustand'

const DEFAULT_FOV = 75

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
