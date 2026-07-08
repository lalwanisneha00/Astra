import { getConstellationName } from '@/astronomy/constellationNames'
import { formatDeclination, formatRightAscension } from '@/astronomy/format'
import { STAR_CONTENT } from '@/content/stars'
import type { Star } from '@/types/star'
import { InfoPanel, type InfoPanelFact } from './InfoPanel'

interface StarPanelProps {
  star: Star
  onClose: () => void
}

const PLACEHOLDER = '—'

function formatNumber(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? PLACEHOLDER : value.toFixed(digits)
}

/** Star-specific variant of InfoPanel — most catalog stars have no proper
 * name or authored content, so every field below degrades gracefully to
 * "—" rather than assuming data that doesn't exist for this star. */
export function StarPanel({ star, onClose }: StarPanelProps) {
  const displayName = star.names[0] ?? `HYG ${star.id}`
  const altNames = star.names.slice(1)
  const content = STAR_CONTENT[displayName]
  const constellationName = getConstellationName(star.constellation)

  const facts: InfoPanelFact[] = [
    {
      label: 'Alt. designations',
      value: altNames.length > 0 ? altNames.join(', ') : PLACEHOLDER,
    },
    { label: 'Apparent magnitude', value: formatNumber(star.magnitude) },
    { label: 'Distance', value: `${formatNumber(star.distanceLy, 1)} ly` },
    { label: 'Spectral class', value: star.spectralClass ?? PLACEHOLDER },
    {
      label: 'Temperature',
      value: star.temperatureK ? `${Math.round(star.temperatureK)} K` : PLACEHOLDER,
    },
    { label: 'Radius', value: PLACEHOLDER },
    { label: 'Mass', value: PLACEHOLDER },
    {
      label: 'Luminosity',
      value: star.luminositySolar ? `${formatNumber(star.luminositySolar, 2)}× Sun` : PLACEHOLDER,
    },
    { label: 'Color', value: star.colorHex.toUpperCase() },
    { label: 'Constellation', value: constellationName ?? PLACEHOLDER },
    { label: 'Right ascension', value: formatRightAscension(star.equatorial.ra) },
    { label: 'Declination', value: formatDeclination(star.equatorial.dec) },
  ]

  return (
    <InfoPanel
      title={displayName}
      subtitle={constellationName ?? undefined}
      facts={facts}
      description={content?.description}
      funFacts={content?.funFacts}
      onClose={onClose}
    />
  )
}
