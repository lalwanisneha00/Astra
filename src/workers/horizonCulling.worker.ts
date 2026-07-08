import { equatorialToHorizontal } from '@/astronomy/horizontal'
import type { ObserverLocation } from '@/types/coordinates'

export interface HorizonCullingRequest {
  ra: number[]
  dec: number[]
  observer: ObserverLocation
  dateMs: number
}

export interface HorizonCullingResponse {
  /** One altitude (degrees) per input star, same order as the request. */
  altitudes: Float32Array
}

/** Computes every star's altitude for a given observer/time in one batch
 * — the whole point of doing this in a worker is to send one message
 * for the entire catalog, not one round trip per star. */
self.onmessage = (event: MessageEvent<HorizonCullingRequest>) => {
  const { ra, dec, observer, dateMs } = event.data
  const date = new Date(dateMs)
  const altitudes = new Float32Array(ra.length)

  for (let i = 0; i < ra.length; i++) {
    const raDeg = ra[i] ?? 0
    const decDeg = dec[i] ?? 0
    altitudes[i] = equatorialToHorizontal({ ra: raDeg, dec: decDeg }, observer, date).altitude
  }

  const response: HorizonCullingResponse = { altitudes }
  self.postMessage(response, { transfer: [altitudes.buffer] })
}
