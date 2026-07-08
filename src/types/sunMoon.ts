import type { EquatorialCoord } from './coordinates'

export interface SunPosition {
  equatorial: EquatorialCoord
  distanceAu: number
}

export interface MoonPosition {
  equatorial: EquatorialCoord
  distanceAu: number
  /** Illuminated fraction, 0 (new) to 1 (full). */
  illumination: number
  /** Phase angle in degrees: 0 = new, 90 = first quarter, 180 = full,
   * 270 = last quarter. 0-180 is waxing (growing), 180-360 is waning
   * (shrinking). */
  phaseAngle: number
}
