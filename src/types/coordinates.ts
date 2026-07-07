/** Equatorial J2000 coordinates. Both axes in degrees, never hours — this
 * is the one place in the codebase RA units get standardized, precisely to
 * avoid an hours/degrees mismatch anywhere downstream. */
export interface EquatorialCoord {
  /** Right ascension, degrees, 0-360. */
  ra: number
  /** Declination, degrees, -90 to 90. */
  dec: number
}
