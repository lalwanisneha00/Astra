import { create } from 'zustand'

export type CatalogLoadStatus = 'idle' | 'loading' | 'loaded' | 'error'

interface DataStore {
  catalogStatus: Record<string, CatalogLoadStatus>
  catalogErrors: Record<string, string>
  setCatalogStatus: (catalog: string, status: CatalogLoadStatus) => void
  setCatalogError: (catalog: string, message: string) => void
}

/** Per-catalog load status (stars, constellations, DSOs, ...), see Phase 3+. */
export const useDataStore = create<DataStore>((set) => ({
  catalogStatus: {},
  catalogErrors: {},
  setCatalogStatus: (catalog, status) =>
    set((state) => ({ catalogStatus: { ...state.catalogStatus, [catalog]: status } })),
  setCatalogError: (catalog, message) =>
    set((state) => ({ catalogErrors: { ...state.catalogErrors, [catalog]: message } })),
}))
