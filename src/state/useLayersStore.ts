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

/** One boolean per toggle in the controls dock (see Phase 12). */
export const useLayersStore = create<LayersStore>((set) => ({
  constellationLines: true,
  constellationNames: true,
  starNames: false,
  equatorialGrid: false,
  horizontalGrid: false,
  deepSky: true,
  planets: true,
  labels: true,
  mythology: false,
  setLayer: (layer, visible) => set((state) => ({ ...state, [layer]: visible })),
  toggleLayer: (layer) => set((state) => ({ ...state, [layer]: !state[layer] })),
}))
