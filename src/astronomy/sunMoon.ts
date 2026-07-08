import * as Astronomy from 'astronomy-engine'
import type { EquatorialCoord, ObserverLocation } from '@/types/coordinates'
import type { MoonPosition, SunPosition } from '@/types/sunMoon'

interface EquatorialWithDistance extends EquatorialCoord {
  distanceAu: number
}

function toAstronomyObserver(location: ObserverLocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, 0)
}

function geocentricEquatorial(body: Astronomy.Body, date: Date): EquatorialWithDistance {
  const vector = Astronomy.GeoVector(body, date, true)
  const equatorial = Astronomy.EquatorFromVector(vector)
  return { ra: equatorial.ra * 15, dec: equatorial.dec, distanceAu: equatorial.dist }
}

/** Topocentric position — `ofdate: false` still applies the full
 * parallax shift (it subtracts the observer's own geocentric position
 * vector before converting to RA/Dec — see astronomy-engine's source),
 * just expressed in the same J2000 frame every other layer already
 * uses, so no separate frame handling is needed downstream. */
function topocentricEquatorial(
  body: Astronomy.Body,
  date: Date,
  observer: ObserverLocation,
): EquatorialWithDistance {
  const equatorial = Astronomy.Equator(body, date, toAstronomyObserver(observer), false, true)
  return { ra: equatorial.ra * 15, dec: equatorial.dec, distanceAu: equatorial.dist }
}

/** The Sun's geocentric J2000 position — its own parallax as seen from
 * Earth's surface (~8.8″) is imperceptible at this app's rendering
 * scale, the same reasoning `computePlanetPositions` already uses for
 * the planets, so no topocentric correction is needed here either. */
export function computeSunPosition(date: Date): SunPosition {
  const { ra, dec, distanceAu } = geocentricEquatorial(Astronomy.Body.Sun, date)
  return { equatorial: { ra, dec }, distanceAu }
}

/**
 * The Moon's position — unlike the Sun or any planet, its parallax (up
 * to ~1°, since it's so close) is large enough to matter at this app's
 * rendering scale, so this uses a genuinely topocentric position
 * whenever a real observer is available, falling back to the geocentric
 * position in explore mode, where there's no real observer to correct
 * for.
 */
export function computeMoonPosition(date: Date, observer: ObserverLocation | null): MoonPosition {
  const { ra, dec, distanceAu } = observer
    ? topocentricEquatorial(Astronomy.Body.Moon, date, observer)
    : geocentricEquatorial(Astronomy.Body.Moon, date)

  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date)
  const phaseAngle = Astronomy.MoonPhase(date)

  return {
    equatorial: { ra, dec },
    distanceAu,
    illumination: illumination.phase_fraction,
    phaseAngle,
  }
}
