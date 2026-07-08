import { describe, expect, it } from 'vitest'
import { computePlanetPath, computePlanetPositions, PLANET_IDS } from './planets'

const REFERENCE_DATE = new Date('2024-06-15T22:00:00Z')

describe('computePlanetPositions', () => {
  const planets = computePlanetPositions(REFERENCE_DATE)

  it('returns exactly one entry per planet, in order', () => {
    expect(planets.map((p) => p.id)).toEqual([...PLANET_IDS])
  })

  it('produces coordinates within valid ranges for every planet', () => {
    for (const planet of planets) {
      expect(planet.equatorial.ra).toBeGreaterThanOrEqual(0)
      expect(planet.equatorial.ra).toBeLessThan(360)
      expect(planet.equatorial.dec).toBeGreaterThanOrEqual(-90)
      expect(planet.equatorial.dec).toBeLessThanOrEqual(90)
      expect(planet.distanceAu).toBeGreaterThan(0)
    }
  })

  it('places outer planets much farther from Earth than the Sun-Earth distance alone would suggest is impossible', () => {
    // Sanity check on scale, not exact ephemeris values: Neptune should
    // always be much farther away than Mars can ever be.
    const mars = planets.find((p) => p.id === 'Mars')
    const neptune = planets.find((p) => p.id === 'Neptune')
    expect(mars).toBeDefined()
    expect(neptune).toBeDefined()
    expect(neptune!.distanceAu).toBeGreaterThan(mars!.distanceAu)
  })
})

describe('computePlanetPath', () => {
  it('samples the expected number of points across the requested span', () => {
    const path = computePlanetPath('Mars', REFERENCE_DATE, 90, 4)
    // -90, -86, ..., 90 inclusive with step 4 → 46 points.
    expect(path.length).toBe(46)
  })

  it('agrees with computePlanetPositions at the exact center date (offset 0)', () => {
    const path = computePlanetPath('Venus', REFERENCE_DATE, 8, 8)
    const direct = computePlanetPositions(REFERENCE_DATE).find((p) => p.id === 'Venus')
    // With halfSpan=step=8, samples land at offsets -8, 0, and 8.
    const centerSample = path[1]
    expect(centerSample).toBeDefined()
    expect(direct).toBeDefined()
    expect(centerSample!.ra).toBeCloseTo(direct!.equatorial.ra, 6)
    expect(centerSample!.dec).toBeCloseTo(direct!.equatorial.dec, 6)
  })
})
