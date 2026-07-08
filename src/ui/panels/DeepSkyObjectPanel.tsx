import { getConstellationName } from '@/astronomy/constellationNames'
import { formatDeclination, formatRightAscension } from '@/astronomy/format'
import { DSO_CONTENT } from '@/content/dso'
import { DSO_TYPE_META } from '@/content/dsoTypes'
import type { DeepSkyObject } from '@/types/deepSkyObject'
import { InfoPanel, type InfoPanelFact } from './InfoPanel'

interface DeepSkyObjectPanelProps {
  dso: DeepSkyObject
  onClose: () => void
}

const PLACEHOLDER = '—'

function formatNumber(value: number | null, digits = 2): string {
  return value === null ? PLACEHOLDER : value.toFixed(digits)
}

/** Deep-sky-object variant of InfoPanel. Most of the ~500 curated
 * objects have no hand-written description — like StarPanel, every
 * field degrades gracefully to "—" rather than assuming content that
 * doesn't exist for this object. */
export function DeepSkyObjectPanel({ dso, onClose }: DeepSkyObjectPanelProps) {
  const displayName = dso.messier ?? dso.commonNames[0] ?? dso.id
  const altNames = [
    ...(dso.messier ? [dso.id] : []),
    ...dso.commonNames.filter((name) => name !== displayName),
  ]
  const content = DSO_CONTENT[dso.id]
  const meta = DSO_TYPE_META[dso.type]
  const constellationName = getConstellationName(dso.constellation)

  const facts: InfoPanelFact[] = [
    { label: 'Type', value: meta.label },
    {
      label: 'Alt. designations',
      value: altNames.length > 0 ? altNames.join(', ') : PLACEHOLDER,
    },
    { label: 'Apparent magnitude', value: formatNumber(dso.magnitude, 1) },
    {
      label: 'Apparent size',
      value: dso.sizeArcmin ? `${formatNumber(dso.sizeArcmin, 1)}′` : PLACEHOLDER,
    },
    { label: 'Constellation', value: constellationName ?? PLACEHOLDER },
    { label: 'Right ascension', value: formatRightAscension(dso.equatorial.ra) },
    { label: 'Declination', value: formatDeclination(dso.equatorial.dec) },
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
