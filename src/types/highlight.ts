import type { SelectableObjectType } from '@/state/useSelectionStore'
import type { EquatorialCoord } from './coordinates'

export type HighlightCategory =
  'planet' | 'moon' | 'meteorShower' | 'conjunction' | 'eclipse' | 'dso' | 'constellation'

export type HighlightDifficulty = 'Naked eye' | 'Binoculars' | 'Telescope'

export interface Highlight {
  id: string
  category: HighlightCategory
  /** Emoji glyph, matching this app's existing icon convention (no icon
   * library — see SearchBar's 🔎, InfoPanel's ✕). */
  icon: string
  title: string
  summary: string
  whySpecial: string
  direction: string | null
  timeDescription: string
  visibilityWindow: string
  difficulty: HighlightDifficulty
  /** Lower sorts first — how significant/rare this highlight is. */
  priority: number
  /** Fly-to target — always present, even for highlights with no
   * single "selectable object" of their own (a meteor shower radiant,
   * a conjunction's midpoint). */
  equatorial: EquatorialCoord
  /** If set, picking this highlight also opens the object's existing
   * info panel via the normal selection system — exactly like clicking
   * it directly in the sky. */
  selection?: { type: SelectableObjectType; id: string }
}
