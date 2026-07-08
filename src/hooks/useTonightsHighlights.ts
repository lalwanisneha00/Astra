import { useEffect, useMemo, useState } from 'react'
import { getTonightsHighlights, type HighlightContext } from '@/astronomy/highlights'
import { throttle } from '@/lib/throttle'
import type { Highlight } from '@/types/highlight'

// Tonight's Highlights runs several numerical searches per body
// (rise/set/culmination, plus two eclipse searches) — much heavier than
// a single Horizon() call, so recomputation is throttled far more
// aggressively than TimeSlider's own 120ms date-commit throttle to keep
// active scrubbing/playback smooth (same "protect expensive derived
// state from a fast-moving date" reasoning as useHorizonCulling).
const RECOMPUTE_THROTTLE_MS = 2000

/** Recomputes Tonight's Highlights as the observer/date/catalogs change,
 * throttled so continuous time-scrubbing or playback never floods this
 * with searches. Returns an empty list until the first computation
 * lands or when `context` is null (explore mode, no real observer). */
export function useTonightsHighlights(
  context: HighlightContext | null,
  limit?: number,
): Highlight[] {
  const [highlights, setHighlights] = useState<Highlight[]>([])

  const throttledCompute = useMemo(
    () =>
      throttle(
        (ctx: HighlightContext) => setHighlights(getTonightsHighlights(ctx, limit)),
        RECOMPUTE_THROTTLE_MS,
      ),
    [limit],
  )

  useEffect(() => {
    if (context) throttledCompute(context)
  }, [context, throttledCompute])

  return context ? highlights : []
}
