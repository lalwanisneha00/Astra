import { formatDeclination, formatRightAscension } from '@/astronomy/format'
import { MOON_CONTENT } from '@/content/sunMoon'
import type { MoonPosition } from '@/types/sunMoon'
import { InfoPanel, type InfoPanelFact } from './InfoPanel'

interface MoonPanelProps {
  moon: MoonPosition
  onClose: () => void
}

/** Named phases are conventionally 8 ~45°-wide bands centered on the 4
 * key angles (0/90/180/270), not the continuous angle itself. */
function phaseName(phaseAngle: number): string {
  const normalized = ((phaseAngle % 360) + 360) % 360
  if (normalized < 22.5 || normalized >= 337.5) return 'New Moon'
  if (normalized < 67.5) return 'Waxing Crescent'
  if (normalized < 112.5) return 'First Quarter'
  if (normalized < 157.5) return 'Waxing Gibbous'
  if (normalized < 202.5) return 'Full Moon'
  if (normalized < 247.5) return 'Waning Gibbous'
  if (normalized < 292.5) return 'Last Quarter'
  return 'Waning Crescent'
}

export function MoonPanel({ moon, onClose }: MoonPanelProps) {
  const facts: InfoPanelFact[] = [
    { label: 'Phase', value: phaseName(moon.phaseAngle) },
    { label: 'Illuminated', value: `${Math.round(moon.illumination * 100)}%` },
    { label: 'Diameter', value: `${MOON_CONTENT.diameterKm.toLocaleString()} km` },
    {
      label: 'Mean distance from Earth',
      value: `${MOON_CONTENT.meanDistanceKm.toLocaleString()} km`,
    },
    {
      label: 'Distance right now',
      value: `${Math.round(moon.distanceAu * 149_597_870.7).toLocaleString()} km`,
    },
    { label: 'Orbital period', value: `${MOON_CONTENT.orbitalPeriodDays} days` },
    { label: 'Right ascension', value: formatRightAscension(moon.equatorial.ra) },
    { label: 'Declination', value: formatDeclination(moon.equatorial.dec) },
  ]

  return (
    <InfoPanel
      title="Moon"
      subtitle={phaseName(moon.phaseAngle)}
      facts={facts}
      description={MOON_CONTENT.description}
      funFacts={MOON_CONTENT.funFacts}
      onClose={onClose}
    />
  )
}
