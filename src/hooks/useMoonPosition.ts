import { useMemo } from 'react'
import { computeMoonPosition } from '@/astronomy/sunMoon'
import type { ObserverLocation } from '@/types/coordinates'
import type { MoonPosition } from '@/types/sunMoon'

/** Recomputed via useMemo keyed on date/observer, same reasoning as
 * usePlanetPositions — cheap enough (one body) that no worker is
 * needed. */
export function useMoonPosition(date: Date, observer: ObserverLocation | null): MoonPosition {
  return useMemo(() => computeMoonPosition(date, observer), [date, observer])
}
