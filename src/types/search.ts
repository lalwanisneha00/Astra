import type { SelectableObjectType } from '@/state/useSelectionStore'

export interface SearchResult {
  type: SelectableObjectType
  id: string
  label: string
  subtitle: string
  /** Lower ranks first within a match tier — real apparent magnitude
   * for stars/DSOs, a fixed low value for constellations/planets (few
   * enough, and prominent enough, that they should out-rank an
   * incidentally-matching dim background object). */
  rank: number
  /** Precomputed lowercase blob (alt names, genitive, catalog ids,
   * constellation) searched only after label match fails. */
  keywords: string
}
