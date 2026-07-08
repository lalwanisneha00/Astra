import { useMemo } from 'react'
import { computePlanetPositions } from '@/astronomy/planets'
import type { Planet } from '@/types/planet'

/** Recomputed via useMemo keyed on date, same as GridLayer/HorizonLayer —
 * only 7 bodies, cheap enough that no worker or GPU-side approach (as
 * used for the 40,000+-star catalog) is needed here. */
export function usePlanetPositions(date: Date): Planet[] {
  return useMemo(() => computePlanetPositions(date), [date])
}
