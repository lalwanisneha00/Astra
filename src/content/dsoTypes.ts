import type { DsoTypeCode } from '@/types/deepSkyObject'

/** Which shared sprite texture a DSO type renders with — see
 * scene/textures/dsoTexture.ts. Several types share a rendering
 * treatment (e.g. every nebula variant looks like a soft colored cloud,
 * distinguished by tint and the panel's type label, not a bespoke shape
 * each) to keep the texture set small and legible at small marker sizes. */
export type DsoIconKind =
  'galaxy' | 'openCluster' | 'globularCluster' | 'nebula' | 'planetaryNebula'

export interface DsoTypeMeta {
  label: string
  color: string
  icon: DsoIconKind
}

export const DSO_TYPE_META: Record<DsoTypeCode, DsoTypeMeta> = {
  G: { label: 'Galaxy', color: '#a9c0ff', icon: 'galaxy' },
  OCl: { label: 'Open Cluster', color: '#ffe9a8', icon: 'openCluster' },
  GCl: { label: 'Globular Cluster', color: '#ffcf7a', icon: 'globularCluster' },
  'Cl+N': { label: 'Cluster + Nebula', color: '#ffb38a', icon: 'openCluster' },
  Neb: { label: 'Nebula', color: '#ff9ecf', icon: 'nebula' },
  PN: { label: 'Planetary Nebula', color: '#7de3c8', icon: 'planetaryNebula' },
  SNR: { label: 'Supernova Remnant', color: '#ff8a65', icon: 'nebula' },
  HII: { label: 'Emission Nebula', color: '#ff6f91', icon: 'nebula' },
  RfN: { label: 'Reflection Nebula', color: '#7ab8ff', icon: 'nebula' },
}
