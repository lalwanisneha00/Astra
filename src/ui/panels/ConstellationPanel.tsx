import { CONSTELLATION_CONTENT } from '@/content/constellations'
import { useLayersStore } from '@/state/useLayersStore'
import type { Constellation, Hemisphere } from '@/types/constellation'
import type { Star } from '@/types/star'
import { InfoPanel, type InfoPanelFact } from './InfoPanel'

interface ConstellationPanelProps {
  constellation: Constellation
  /** Pre-filtered/sorted by the caller (brightest first) — see App.tsx. */
  brightestStars: Star[]
  onClose: () => void
  onSelectStar: (starId: string) => void
}

const HEMISPHERE_LABELS: Record<Hemisphere, string> = {
  northern: 'Northern sky',
  southern: 'Southern sky',
  equatorial: 'Near the celestial equator',
}

/** Constellation-specific variant of InfoPanel. Zodiac/hemisphere/best
 * viewing months are computed facts (see astronomy/constellationFacts);
 * mythology and fun facts are hand-written and only exist for a curated
 * set of well-known constellations (src/content/constellations.ts).
 * Both are gated behind the `mythology` layer toggle (Phase 12) —
 * structured facts always show regardless. */
export function ConstellationPanel({
  constellation,
  brightestStars,
  onClose,
  onSelectStar,
}: ConstellationPanelProps) {
  const content = CONSTELLATION_CONTENT[constellation.id]
  const showMythology = useLayersStore((state) => state.mythology)

  const facts: InfoPanelFact[] = [
    { label: 'Genitive', value: constellation.genitive },
    { label: 'Pronunciation', value: content?.pronunciation ?? '—' },
    { label: 'Zodiac', value: constellation.isZodiac ? 'Yes' : 'No' },
    { label: 'Hemisphere', value: HEMISPHERE_LABELS[constellation.hemisphere] },
    { label: 'Best viewed', value: constellation.bestViewingMonths },
  ]

  return (
    <InfoPanel
      title={constellation.name}
      subtitle={content?.pronunciation}
      facts={facts}
      description={showMythology ? content?.mythology : undefined}
      funFacts={showMythology ? content?.funFacts : undefined}
      related={brightestStars.map((star) => ({
        id: star.id,
        label: star.names[0] ?? `HYG ${star.id}`,
        onSelect: () => onSelectStar(star.id),
      }))}
      onClose={onClose}
    />
  )
}
