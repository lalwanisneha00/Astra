import type { EquatorialCoord } from './coordinates'

export interface Star {
  /** Stable HYG catalog id. */
  id: string
  /** Proper name and/or Bayer/Flamsteed designation, whichever exist. */
  names: string[]
  magnitude: number
  absoluteMagnitude: number
  distanceLy: number
  spectralClass: string | null
  /** B-V color index. */
  colorIndex: number
  colorHex: string
  temperatureK: number
  luminositySolar: number | null
  /** IAU 3-letter constellation abbreviation, e.g. "Ori". */
  constellation: string | null
  equatorial: EquatorialCoord
}
