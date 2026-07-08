import type { EquatorialCoord } from './coordinates'

export interface Planet {
  /** astronomy-engine Body name (e.g. "Mercury") — also the key used to
   * look up PLANET_CONTENT and to drive selection/id matching. */
  id: string
  name: string
  equatorial: EquatorialCoord
  /** Geocentric distance in AU at the current simulated date. */
  distanceAu: number
}
