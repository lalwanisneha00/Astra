import { describe, expect, it } from 'vitest'
import { computeMoonPosition, computeSunPosition } from './sunMoon'

const NYC = { latitude: 40.7128, longitude: -74.006 }
const REFERENCE_DATE = new Date('2024-06-15T22:00:00Z')

describe('computeSunPosition', () => {
  it('produces a coordinate within valid ranges and roughly 1 AU away', () => {
    const sun = computeSunPosition(REFERENCE_DATE)
    expect(sun.equatorial.ra).toBeGreaterThanOrEqual(0)
    expect(sun.equatorial.ra).toBeLessThan(360)
    expect(sun.equatorial.dec).toBeGreaterThanOrEqual(-90)
    expect(sun.equatorial.dec).toBeLessThanOrEqual(90)
    expect(sun.distanceAu).toBeGreaterThan(0.98)
    expect(sun.distanceAu).toBeLessThan(1.02)
  })
})

describe('computeMoonPosition', () => {
  it('produces a coordinate within valid ranges and a plausible Earth-Moon distance', () => {
    const moon = computeMoonPosition(REFERENCE_DATE, null)
    expect(moon.equatorial.ra).toBeGreaterThanOrEqual(0)
    expect(moon.equatorial.ra).toBeLessThan(360)
    expect(moon.equatorial.dec).toBeGreaterThanOrEqual(-90)
    expect(moon.equatorial.dec).toBeLessThanOrEqual(90)
    // The Moon's distance ranges roughly 0.0024-0.0027 AU (perigee/apogee).
    expect(moon.distanceAu).toBeGreaterThan(0.002)
    expect(moon.distanceAu).toBeLessThan(0.003)
    expect(moon.illumination).toBeGreaterThanOrEqual(0)
    expect(moon.illumination).toBeLessThanOrEqual(1)
    expect(moon.phaseAngle).toBeGreaterThanOrEqual(0)
    expect(moon.phaseAngle).toBeLessThan(360)
  })

  it('shifts position measurably between the geocentric and topocentric (real observer) case', () => {
    // Lunar parallax is up to ~1 degree -- large enough that a real
    // observer's topocentric position must differ from the geocentric
    // one, unlike the Sun/planets (see the doc comment in sunMoon.ts).
    const geocentric = computeMoonPosition(REFERENCE_DATE, null)
    const topocentric = computeMoonPosition(REFERENCE_DATE, NYC)
    const raDiff = Math.abs(geocentric.equatorial.ra - topocentric.equatorial.ra)
    const decDiff = Math.abs(geocentric.equatorial.dec - topocentric.equatorial.dec)
    expect(raDiff + decDiff).toBeGreaterThan(0.01)
  })

  it('reports the same illumination/phase regardless of observer (those are geometry-only, not parallax-dependent)', () => {
    const geocentric = computeMoonPosition(REFERENCE_DATE, null)
    const topocentric = computeMoonPosition(REFERENCE_DATE, NYC)
    expect(topocentric.illumination).toBeCloseTo(geocentric.illumination, 5)
    expect(topocentric.phaseAngle).toBeCloseTo(geocentric.phaseAngle, 5)
  })
})
