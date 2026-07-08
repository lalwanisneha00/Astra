import { formatDeclination, formatRightAscension } from '@/astronomy/format'
import { PLANET_CONTENT } from '@/content/planets'
import type { Planet } from '@/types/planet'
import { InfoPanel, type InfoPanelFact } from './InfoPanel'

interface PlanetPanelProps {
  planet: Planet
  onClose: () => void
}

const PLACEHOLDER = '—'

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits)
}

/** Planet-specific variant of InfoPanel. Unlike stars, every field here
 * is always known precisely, so PLANET_CONTENT doubles as the source of
 * both the structured facts and the prose — see src/content/planets.ts. */
export function PlanetPanel({ planet, onClose }: PlanetPanelProps) {
  const content = PLANET_CONTENT[planet.id]

  const facts: InfoPanelFact[] = [
    {
      label: 'Diameter',
      value: content ? `${content.diameterKm.toLocaleString()} km` : PLACEHOLDER,
    },
    {
      label: 'Mass',
      value: content ? `${formatNumber(content.massEarths, 3)}× Earth` : PLACEHOLDER,
    },
    {
      label: 'Gravity',
      value: content ? `${formatNumber(content.gravityEarths, 2)}× Earth` : PLACEHOLDER,
    },
    { label: 'Moons', value: content ? String(content.moons) : PLACEHOLDER },
    {
      label: 'Orbital period',
      value: content ? `${formatNumber(content.orbitalPeriodDays, 1)} days` : PLACEHOLDER,
    },
    {
      label: 'Rotation period',
      value: content
        ? `${formatNumber(Math.abs(content.rotationPeriodHours), 1)} hrs`
        : PLACEHOLDER,
    },
    {
      label: 'Distance from Sun',
      value: content ? `${formatNumber(content.meanDistanceAu, 3)} AU` : PLACEHOLDER,
    },
    { label: 'Distance from Earth (now)', value: `${formatNumber(planet.distanceAu, 3)} AU` },
    { label: 'Right ascension', value: formatRightAscension(planet.equatorial.ra) },
    { label: 'Declination', value: formatDeclination(planet.equatorial.dec) },
  ]

  return (
    <InfoPanel
      title={planet.name}
      subtitle="Planet"
      facts={facts}
      description={content?.description}
      funFacts={content?.funFacts}
      onClose={onClose}
    />
  )
}
