import { useMemo } from 'react'
import { getConstellationName } from '@/astronomy/constellationNames'
import { PLANET_IDS } from '@/astronomy/planets'
import { CONSTELLATION_ALIASES, STAR_ALIASES } from '@/content/aliases'
import { DSO_TYPE_META } from '@/content/dsoTypes'
import type { Constellation } from '@/types/constellation'
import type { DeepSkyObject } from '@/types/deepSkyObject'
import type { SearchResult } from '@/types/search'
import type { Star } from '@/types/star'

/**
 * Builds the unified search index — pure and exported separately from
 * the hook below so it can be unit-tested directly (e.g. confirming
 * "north star" actually finds Polaris) without needing to render a
 * component. Only stars with a real name are indexed — the ~40,000
 * unnamed catalog entries have no string a user could type to find
 * them. Search results carry no coordinates: the selection handler
 * resolves the live object by (type, id) at pick time instead, so a
 * planet's fly-to target is always its current position, never a stale
 * snapshot from whenever the index was built.
 */
export function buildSearchIndex(
  stars: Star[],
  constellations: Constellation[],
  dsos: DeepSkyObject[],
): SearchResult[] {
  const results: SearchResult[] = []

  for (const star of stars) {
    const label = star.names[0]
    if (!label) continue
    const constellationName = getConstellationName(star.constellation)
    const aliases = STAR_ALIASES[label] ?? []
    results.push({
      type: 'star',
      id: star.id,
      label,
      subtitle: constellationName ?? 'Star',
      rank: star.magnitude,
      keywords: [...star.names, constellationName ?? '', ...aliases].join(' ').toLowerCase(),
    })
  }

  for (const constellation of constellations) {
    const aliases = CONSTELLATION_ALIASES[constellation.id] ?? []
    results.push({
      type: 'constellation',
      id: constellation.id,
      label: constellation.name,
      subtitle: 'Constellation',
      rank: -2,
      keywords: [constellation.name, constellation.genitive, constellation.id, ...aliases]
        .join(' ')
        .toLowerCase(),
    })
  }

  results.push(
    { type: 'sun', id: 'sun', label: 'Sun', subtitle: 'Star', rank: -10, keywords: 'sun' },
    { type: 'moon', id: 'moon', label: 'Moon', subtitle: 'Moon', rank: -9, keywords: 'moon' },
  )

  for (const id of PLANET_IDS) {
    results.push({
      type: 'planet',
      id,
      label: id,
      subtitle: 'Planet',
      rank: -3,
      keywords: id.toLowerCase(),
    })
  }

  for (const dso of dsos) {
    const label = dso.messier ?? dso.commonNames[0] ?? dso.id
    results.push({
      type: 'dso',
      id: dso.id,
      label,
      subtitle: DSO_TYPE_META[dso.type].label,
      rank: dso.magnitude ?? 10,
      keywords: [dso.id, dso.messier ?? '', ...dso.commonNames].join(' ').toLowerCase(),
    })
  }

  return results
}

/**
 * Stars and constellations load once and never change identity
 * afterward, and planet ids are a static constant, so this never
 * touches the store's per-date-tick `planets` array (which *would*
 * rebuild every throttled tick during time scrubbing, the exact class
 * of problem Phase 8's fix eliminated for the star catalog).
 */
export function useSearchIndex(
  stars: Star[],
  constellations: Constellation[],
  dsos: DeepSkyObject[],
): SearchResult[] {
  return useMemo(() => buildSearchIndex(stars, constellations, dsos), [stars, constellations, dsos])
}
