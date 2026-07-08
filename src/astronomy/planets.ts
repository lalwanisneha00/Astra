import * as Astronomy from 'astronomy-engine'
import type { EquatorialCoord } from '@/types/coordinates'
import type { Planet } from '@/types/planet'

export const PLANET_IDS = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
] as const

export type PlanetId = (typeof PLANET_IDS)[number]

const MS_PER_DAY = 86_400_000

interface EquatorialWithDistance extends EquatorialCoord {
  distanceAu: number
}

/**
 * `GeoVector` returns geocentric Cartesian coordinates in the J2000
 * equatorial system (EQJ) — light-time corrected, and here also
 * aberration-corrected — the exact same frame the HYG star catalog is
 * already in. Converting through that same frame (rather than "of-date"
 * apparent coordinates) means planets place via the exact same
 * `equatorialToCartesian` pipeline and cull via the exact same
 * `equatorialToHorizontal`/`Horizon()` call stars use, with no separate
 * topocentric parallax handling needed: at this rendering scale (a fixed-
 * radius celestial sphere, not true distances) parallax would be
 * imperceptible even for Mercury/Venus.
 */
function equatorialAt(body: Astronomy.Body, date: Date): EquatorialWithDistance {
  const vector = Astronomy.GeoVector(body, date, true)
  const equatorial = Astronomy.EquatorFromVector(vector)
  return { ra: equatorial.ra * 15, dec: equatorial.dec, distanceAu: equatorial.dist }
}

/** Every planet's position at the given date, ready for the same
 * rendering/culling pipeline the star catalog uses. Cheap enough (7
 * bodies) to call directly wherever it's needed — no worker required,
 * unlike the 40,000+-star horizon culling. */
export function computePlanetPositions(date: Date): Planet[] {
  return PLANET_IDS.map((id) => {
    const { ra, dec, distanceAu } = equatorialAt(Astronomy.Body[id], date)
    return { id, name: id, equatorial: { ra, dec }, distanceAu }
  })
}

/**
 * Samples one planet's own apparent position across a window of days
 * centered on `centerDate` — the path it traces across the sky over
 * time. This is the "orbit" this app can meaningfully show: the
 * rendering model has no 3D solar-system view, only the observer-
 * centered celestial sphere, so a true heliocentric ellipse has no
 * direct on-sky representation, but the apparent path (including
 * retrograde loops for the outer planets) does.
 */
export function computePlanetPath(
  id: PlanetId,
  centerDate: Date,
  halfSpanDays: number,
  stepDays: number,
): EquatorialCoord[] {
  const body = Astronomy.Body[id]
  const points: EquatorialCoord[] = []
  for (let offset = -halfSpanDays; offset <= halfSpanDays; offset += stepDays) {
    const date = new Date(centerDate.getTime() + offset * MS_PER_DAY)
    const { ra, dec } = equatorialAt(body, date)
    points.push({ ra, dec })
  }
  return points
}
