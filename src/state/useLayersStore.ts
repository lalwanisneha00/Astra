import { create } from 'zustand'

interface LayerVisibility {
  constellationLines: boolean
  constellationNames: boolean
  starNames: boolean
  equatorialGrid: boolean
  horizontalGrid: boolean
  deepSky: boolean
  planets: boolean
  labels: boolean
  mythology: boolean
}

export type LayerName = keyof LayerVisibility

interface LayersStore extends LayerVisibility {
  setLayer: (layer: LayerName, visible: boolean) => void
  toggleLayer: (layer: LayerName) => void
}

/** One boolean per toggle in the controls dock (see Phase 12,
 * LayerToggleDock). `mythology` defaults true (flipped from Phase 1's
 * placeholder `false` once Phase 12 gave it a real effect — gating
 * ConstellationPanel's mythology/fun-facts text): defaulting it off
 * would have made existing curated content disappear the moment the
 * flag actually started doing something, a visible regression nobody
 * asked for. Every other default matches whether that layer clutters a
 * first-time view (dense grids/star names off) or is core content
 * (constellation lines/names, planets, deep-sky, object labels on). */
export const useLayersStore = create<LayersStore>((set) => ({
  constellationLines: true,
  constellationNames: true,
  starNames: false,
  equatorialGrid: false,
  horizontalGrid: false,
  deepSky: true,
  planets: true,
  labels: true,
  mythology: true,
  setLayer: (layer, visible) => set((state) => ({ ...state, [layer]: visible })),
  toggleLayer: (layer) => set((state) => ({ ...state, [layer]: !state[layer] })),
}))
