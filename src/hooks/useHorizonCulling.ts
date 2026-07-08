import { useEffect, useMemo, useRef, useState } from 'react'
import type { ObserverLocation } from '@/types/coordinates'
import type { Star } from '@/types/star'
import type { HorizonCullingRequest, HorizonCullingResponse } from '@/workers/horizonCulling.worker'

/**
 * Computes every star's current altitude off the main thread, one batched
 * message per recompute (not one per star — see the worker for why that
 * distinction matters). Returns null when culling isn't active, or while
 * a computation for the current inputs hasn't come back yet.
 */
export function useHorizonCulling(
  stars: Star[],
  enabled: boolean,
  observer: ObserverLocation | null,
  date: Date,
): Float32Array | null {
  const [altitudes, setAltitudes] = useState<Float32Array | null>(null)
  const workerRef = useRef<Worker | null>(null)

  // Built once per `stars` change (a handful of times per session, as
  // tiers load), not on every date tick during scrubbing/playback —
  // otherwise every throttled recompute would re-map all ~40,000 stars
  // on the main thread for no reason, since the coordinates themselves
  // never change.
  const raDec = useMemo(
    () => ({
      ra: stars.map((star) => star.equatorial.ra),
      dec: stars.map((star) => star.equatorial.dec),
    }),
    [stars],
  )

  useEffect(() => {
    const worker = new Worker(new URL('../workers/horizonCulling.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<HorizonCullingResponse>) => {
      setAltitudes(event.data.altitudes)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !observer || raDec.ra.length === 0) return

    const request: HorizonCullingRequest = {
      ra: raDec.ra,
      dec: raDec.dec,
      observer,
      dateMs: date.getTime(),
    }
    workerRef.current?.postMessage(request)
  }, [raDec, enabled, observer, date])

  // Derived rather than reset via setState-in-effect: whatever the last
  // computation returned, it's only meaningful while culling is enabled.
  return enabled && observer ? altitudes : null
}
