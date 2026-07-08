import { formatDeclination, formatRightAscension } from '@/astronomy/format'
import { SUN_CONTENT } from '@/content/sunMoon'
import type { SunPosition } from '@/types/sunMoon'
import { InfoPanel, type InfoPanelFact } from './InfoPanel'

interface SunPanelProps {
  sun: SunPosition
  onClose: () => void
}

const AU_KM = 149_597_870.7

export function SunPanel({ sun, onClose }: SunPanelProps) {
  const facts: InfoPanelFact[] = [
    { label: 'Diameter', value: `${SUN_CONTENT.diameterKm.toLocaleString()} km` },
    { label: 'Mass', value: `${SUN_CONTENT.massEarths.toLocaleString()}× Earth` },
    { label: 'Surface temperature', value: `${SUN_CONTENT.surfaceTempK.toLocaleString()} K` },
    { label: 'Age', value: `${SUN_CONTENT.ageBillionYears} billion years` },
    {
      label: 'Distance from Earth (now)',
      value: `${(sun.distanceAu * AU_KM).toLocaleString(undefined, { maximumFractionDigits: 0 })} km`,
    },
    { label: 'Right ascension', value: formatRightAscension(sun.equatorial.ra) },
    { label: 'Declination', value: formatDeclination(sun.equatorial.dec) },
  ]

  return (
    <InfoPanel
      title="Sun"
      subtitle="Star"
      facts={facts}
      description={SUN_CONTENT.description}
      funFacts={SUN_CONTENT.funFacts}
      onClose={onClose}
    />
  )
}
