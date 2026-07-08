import { useMemo } from 'react'
import { getConstellationName } from '@/astronomy/constellationNames'
import { PLANET_IDS } from '@/astronomy/planets'
import { DSO_TYPE_META } from '@/content/dsoTypes'
import type { Constellation } from '@/types/constellation'
import type { DeepSkyObject } from '@/types/deepSkyObject'
import type { SearchResult } from '@/types/search'
import type { Star } from '@/types/star'

/**
 * Builds the unified search index once per catalog load — stars and
 * constellations load once and never change identity afterward, and
 * planet ids are a static constant, so this never touches the store's
 * per-date-tick `planets` array (which *would* rebuild every throttled
 * tick during time scrubbing, the exact class of problem Phase 8's fix
 * eliminated for the star catalog). Only stars with a real name are
 * indexed — the ~40,000 unnamed catalog entries have no string a user
 * could type to find them. Search results carry no coordinates: the
 * selection handler resolves the live object by (type, id) at pick time
 * instead, so a planet's fly-to target is always its current position,
 * never a stale snapshot from whenever the index was built.
 */
export function useSearchIndex(
  stars: Star[],
  constellations: Constellation[],
  dsos: DeepSkyObject[],
): SearchResult[] {
  return useMemo(() => {
    const results: SearchResult[] = []

    for (const star of stars) {
      const label = star.names[0]
      if (!label) continue
      const constellationName = getConstellationName(star.constellation)
      results.push({
        type: 'star',
        id: star.id,
        label,
        subtitle: constellationName ?? 'Star',
        rank: star.magnitude,
        keywords: [...star.names, constellationName ?? ''].join(' ').toLowerCase(),
      })
    }

    for (const constellation of constellations) {
      results.push({
        type: 'constellation',
        id: constellation.id,
        label: constellation.name,
        subtitle: 'Constellation',
        rank: -2,
        keywords:
          `${constellation.name} ${constellation.genitive} ${constellation.id}`.toLowerCase(),
      })
    }

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
  }, [stars, constellations, dsos])
}
