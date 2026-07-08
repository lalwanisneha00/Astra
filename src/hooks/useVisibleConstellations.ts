import { useMemo } from 'react'
import { equatorialToHorizontal } from '@/astronomy/horizontal'
import type { Constellation } from '@/types/constellation'
import type { ObserverLocation } from '@/types/coordinates'

/** A constellation counts as "up" if any one of its line vertices is
 * above the horizon — a whole constellation can span 30+ degrees, so
 * requiring the whole figure (or just its label point) to be up would
 * hide constellations that are genuinely half-risen. This doesn't clip
 * the below-horizon half of a partially-risen figure, just decides
 * whether to draw the whole thing — a reasonable approximation at this
 * scale, not a full per-segment horizon clip. */
function isConstellationVisible(
  constellation: Constellation,
  observer: ObserverLocation,
  date: Date,
): boolean {
  const { lines } = constellation
  for (let i = 0; i < lines.length; i += 2) {
    const ra = lines[i]
    const dec = lines[i + 1]
    if (ra === undefined || dec === undefined) continue
    if (equatorialToHorizontal({ ra, dec }, observer, date).altitude >= 0) {
      return true
    }
  }
  return false
}

/**
 * Returns every constellation unchanged in explore mode. In observer
 * mode, filters out constellations that are entirely below the horizon
 * — otherwise their lines/labels would still show even though every
 * star they connect has been culled by useVisibleStarCatalog, which is
 * exactly the confusing "ghost constellation" bug this hook exists to
 * avoid.
 */
export function useVisibleConstellations(
  constellations: Constellation[],
  observer: ObserverLocation | null,
  date: Date,
): Constellation[] {
  return useMemo(() => {
    if (!observer) return constellations
    return constellations.filter((constellation) =>
      isConstellationVisible(constellation, observer, date),
    )
  }, [constellations, observer, date])
}
