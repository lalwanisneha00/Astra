import type { EquatorialCoord } from './coordinates'

export type Hemisphere = 'northern' | 'southern' | 'equatorial'

export interface Constellation {
  /** IAU 3-letter abbreviation, e.g. "Ori". */
  id: string
  name: string
  /** Latin genitive form, used in star designations (e.g. "Orionis"). */
  genitive: string
  /** Where the constellation's name label is drawn. */
  labelPosition: EquatorialCoord
  /** Flat [ra, dec, ra, dec, ...] pairs, degrees — every 4 numbers is one
   * line segment. */
  lines: number[]
  isZodiac: boolean
  hemisphere: Hemisphere
  /** Approximate 3-month window when the constellation is well-placed in
   * the evening sky (see astronomy/constellationFacts.ts) — a rough,
   * clearly-labeled estimate, not a precise ephemeris calculation. */
  bestViewingMonths: string
}
