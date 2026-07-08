/** Equatorial J2000 coordinates. Both axes in degrees, never hours — this
 * is the one place in the codebase RA units get standardized, precisely to
 * avoid an hours/degrees mismatch anywhere downstream. */
export interface EquatorialCoord {
  /** Right ascension, degrees, 0-360. */
  ra: number
  /** Declination, degrees, -90 to 90. */
  dec: number
}

/** Horizontal (observer-relative) coordinates. Azimuth is measured from
 * north, increasing through east (matching astronomy-engine's
 * convention): north = 0, east = 90, south = 180, west = 270. */
export interface HorizontalCoord {
  /** Altitude above (positive) or below (negative) the horizon, degrees. */
  altitude: number
  /** Azimuth, degrees, 0-360, measured from north through east. */
  azimuth: number
}

/** An observer's location on Earth's surface. */
export interface ObserverLocation {
  /** Degrees north of the equator, -90 to 90 (negative = south). */
  latitude: number
  /** Degrees east of Greenwich, -180 to 180 (negative = west). */
  longitude: number
}
