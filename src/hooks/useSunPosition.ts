import { useMemo } from 'react'
import { computeSunPosition } from '@/astronomy/sunMoon'
import type { SunPosition } from '@/types/sunMoon'

/** Recomputed via useMemo keyed on date, same reasoning as
 * usePlanetPositions — cheap enough (one body) that no worker is
 * needed. */
export function useSunPosition(date: Date): SunPosition {
  return useMemo(() => computeSunPosition(date), [date])
}
