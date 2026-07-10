import { useIsMobileViewport } from '@/hooks/useIsMobileViewport'
import { DesktopInfoPanel } from './DesktopInfoPanel'
import { MobileInfoSheet } from './MobileInfoSheet'

export interface InfoPanelFact {
  label: string
  value: string
}

export interface InfoPanelRelatedItem {
  id: string
  label: string
  onSelect: () => void
}

export interface InfoPanelProps {
  title: string
  subtitle?: string
  facts: InfoPanelFact[]
  description?: string
  funFacts?: string[]
  related?: InfoPanelRelatedItem[]
  onClose: () => void
}

/**
 * Generic detail panel shell for every selectable object type (star,
 * constellation, planet, DSO, Sun, Moon) — each type-specific panel
 * (`StarPanel` etc.) only builds the `facts`/`description`/etc. and
 * renders through this.
 *
 * Below the `md` breakpoint this renders `MobileInfoSheet` (a draggable
 * bottom sheet) instead of `DesktopInfoPanel` (the fixed top-right
 * panel): on a narrow phone screen, the top-right panel's title sits
 * directly behind the logo/search header, hidden rather than merely
 * misplaced. The desktop panel is completely unmodified by this split —
 * same file contents as before, just moved into its own component.
 */
export function InfoPanel(props: InfoPanelProps) {
  const isMobile = useIsMobileViewport()
  return isMobile ? <MobileInfoSheet {...props} /> : <DesktopInfoPanel {...props} />
}
