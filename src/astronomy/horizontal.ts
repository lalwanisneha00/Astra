import * as Astronomy from 'astronomy-engine'
import { clamp, degToRad, radToDeg } from '@/lib/math'
import type { EquatorialCoord, HorizontalCoord, ObserverLocation } from '@/types/coordinates'

function toAstronomyObserver(location: ObserverLocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, 0)
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * Converts equatorial (RA/Dec, degrees) to horizontal (Alt/Az, degrees)
 * for a given observer and time, via astronomy-engine's `Horizon()` —
 * which accounts for precession/nutation internally, so far-future/past
 * dates aren't a separate concern here.
 *
 * `Horizon()` expects RA in sidereal *hours*, not degrees — this is the
 * one place that conversion happens, specifically to avoid the
 * hours/degrees mismatch bugs this kind of transform is notorious for.
 */
export function equatorialToHorizontal(
  equatorial: EquatorialCoord,
  observer: ObserverLocation,
  date: Date,
): HorizontalCoord {
  const raHours = equatorial.ra / 15
  const result = Astronomy.Horizon(date, toAstronomyObserver(observer), raHours, equatorial.dec)
  return { altitude: result.altitude, azimuth: result.azimuth }
}

/** Local Apparent Sidereal Time, in degrees [0, 360). */
export function localSiderealTimeDegrees(date: Date, longitudeDeg: number): number {
  const gastHours = Astronomy.SiderealTime(date)
  const lstHours = (((gastHours + longitudeDeg / 15) % 24) + 24) % 24
  return lstHours * 15
}

/**
 * Converts horizontal (Alt/Az, degrees) to equatorial (RA/Dec, degrees)
 * for a given observer and time — the inverse of `equatorialToHorizontal`.
 * astronomy-engine doesn't expose this direction as a simple function, so
 * this implements the standard spherical-astronomy formula directly (see
 * horizontal.test.ts for round-trip and cross-checks against `Horizon()`,
 * since there's no simpler independent reference to verify this against).
 */
export function horizontalToEquatorial(
  horizontal: HorizontalCoord,
  observer: ObserverLocation,
  date: Date,
): EquatorialCoord {
  const lat = degToRad(observer.latitude)
  const alt = degToRad(horizontal.altitude)
  const az = degToRad(horizontal.azimuth)

  const dec = Math.asin(
    clamp(Math.sin(alt) * Math.sin(lat) + Math.cos(alt) * Math.cos(lat) * Math.cos(az), -1, 1),
  )

  const sinH = (-Math.sin(az) * Math.cos(alt)) / Math.cos(dec)
  const cosH = (Math.sin(alt) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec))
  const hourAngleDeg = radToDeg(Math.atan2(sinH, cosH))

  const lstDeg = localSiderealTimeDegrees(date, observer.longitude)

  return { ra: normalizeDegrees(lstDeg - hourAngleDeg), dec: radToDeg(dec) }
}
