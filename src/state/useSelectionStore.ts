import { create } from 'zustand'

export type SelectableObjectType = 'star' | 'constellation' | 'planet' | 'dso' | 'sun' | 'moon'

export interface ObjectSelection {
  type: SelectableObjectType
  id: string
}

interface SelectionStore {
  selection: ObjectSelection | null
  select: (selection: ObjectSelection) => void
  clearSelection: () => void
}

/** Drives which (if any) info panel is open. */
export const useSelectionStore = create<SelectionStore>((set) => ({
  selection: null,
  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
}))
